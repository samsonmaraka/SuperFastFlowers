import { PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv } from '@/lib/env';
import { orderIdFromPesapalMerchantReference } from '@/lib/pesapal';
import { OrderRequest, OrderStatus, PesapalOrderPayment, VendorFulfillmentStatus } from '@/lib/types';
import { orderLineCustomizationKey } from '@/lib/customization';

const memoryOrders: OrderRequest[] = [];

export async function createOrder(order: OrderRequest) {
  if (!getEnv().orderTableName) {
    memoryOrders.push(order);
    return order;
  }
  await db.send(new PutCommand({ TableName: getEnv().orderTableName, Item: { ...order, pk: `ORDER#${order.id}`, sk: order.createdAt } }));
  return order;
}

export async function getOrderById(orderId: string) {
  if (!getEnv().orderTableName) return memoryOrders.find((order) => order.id === orderId) || null;
  const response = await db.send(new QueryCommand({ TableName: getEnv().orderTableName, KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `ORDER#${orderId}` }, Limit: 1, ScanIndexForward: false }));
  return ((response.Items || [])[0] as OrderRequest | undefined) || null;
}

export async function getOrderByPesapalMerchantReference(merchantReference: string) {
  const orderId = orderIdFromPesapalMerchantReference(merchantReference);
  const order = await getOrderById(orderId);
  if (order) return order;

  if (!getEnv().orderTableName) {
    return memoryOrders.find((item) => item.pesapal?.merchantReference === merchantReference) || null;
  }

  const response = await db.send(new ScanCommand({
    TableName: getEnv().orderTableName,
    FilterExpression: '#pesapal.#merchantReference = :merchantReference',
    ExpressionAttributeNames: {
      '#pesapal': 'pesapal',
      '#merchantReference': 'merchantReference'
    },
    ExpressionAttributeValues: {
      ':merchantReference': merchantReference
    }
  }));

  return ((response.Items || [])[0] as OrderRequest | undefined) || null;
}

export async function listOrders() {
  if (!getEnv().orderTableName) return [...memoryOrders].sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
  // Scan is simplest safe option for admin list without requiring new index.
  const res = await db.send(new ScanCommand({ TableName: getEnv().orderTableName }));
  return ((res.Items || []) as OrderRequest[]).sort((a,b)=> (b.createdAt||'').localeCompare(a.createdAt||''));
}

/** Every order created at or after `sinceIso`, following DynamoDB scan pagination. */
export async function listOrdersCreatedSince(sinceIso: string) {
  if (!getEnv().orderTableName) return memoryOrders.filter((order) => (order.createdAt || '') >= sinceIso);
  const items: OrderRequest[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await db.send(new ScanCommand({
      TableName: getEnv().orderTableName,
      FilterExpression: '#createdAt >= :since',
      ExpressionAttributeNames: { '#createdAt': 'createdAt' },
      ExpressionAttributeValues: { ':since': sinceIso },
      ExclusiveStartKey: exclusiveStartKey
    }));
    items.push(...((res.Items || []) as OrderRequest[]));
    exclusiveStartKey = res.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (exclusiveStartKey);
  return items;
}

/**
 * Atomically records that the owner was told about an unfinished payment.
 * Returns false if another run already claimed this order, so overlapping
 * scheduler runs never send the same alert twice.
 */
export async function claimAbandonedCheckoutNotification(order: OrderRequest, notifiedAt: string) {
  if (!getEnv().orderTableName) {
    const idx = memoryOrders.findIndex((o) => o.id === order.id);
    if (idx < 0 || memoryOrders[idx].abandonedCheckoutNotifiedAt) return false;
    memoryOrders[idx] = { ...memoryOrders[idx], abandonedCheckoutNotifiedAt: notifiedAt };
    return true;
  }
  try {
    await db.send(new UpdateCommand({
      TableName: getEnv().orderTableName,
      Key: { pk: `ORDER#${order.id}`, sk: order.createdAt },
      UpdateExpression: 'SET #notifiedAt = :notifiedAt',
      ConditionExpression: 'attribute_exists(pk) AND attribute_not_exists(#notifiedAt) AND #status <> :paid',
      ExpressionAttributeNames: { '#notifiedAt': 'abandonedCheckoutNotifiedAt', '#status': 'status' },
      ExpressionAttributeValues: { ':notifiedAt': notifiedAt, ':paid': 'PAID' }
    }));
    return true;
  } catch (error) {
    if ((error as { name?: string })?.name === 'ConditionalCheckFailedException') return false;
    throw error;
  }
}

/** Undoes a claim when the alert email could not be sent, so the next run retries it. */
export async function releaseAbandonedCheckoutNotification(order: OrderRequest) {
  if (!getEnv().orderTableName) {
    const idx = memoryOrders.findIndex((o) => o.id === order.id);
    if (idx >= 0) memoryOrders[idx] = { ...memoryOrders[idx], abandonedCheckoutNotifiedAt: undefined };
    return;
  }
  await db.send(new UpdateCommand({
    TableName: getEnv().orderTableName,
    Key: { pk: `ORDER#${order.id}`, sk: order.createdAt },
    UpdateExpression: 'REMOVE #notifiedAt',
    ExpressionAttributeNames: { '#notifiedAt': 'abandonedCheckoutNotifiedAt' }
  }));
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const existing = await getOrderById(orderId);
  if (!existing) return null;
  if (!getEnv().orderTableName) {
    const idx = memoryOrders.findIndex((o) => o.id === orderId);
    if (idx >= 0) memoryOrders[idx] = { ...memoryOrders[idx], status, updatedAt: new Date().toISOString() };
    return idx >= 0 ? memoryOrders[idx] : null;
  }
  const updatedAt = new Date().toISOString();
  await db.send(new UpdateCommand({ TableName: getEnv().orderTableName, Key: { pk: `ORDER#${orderId}`, sk: existing.createdAt }, UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt', ExpressionAttributeNames: { '#status': 'status', '#updatedAt': 'updatedAt' }, ExpressionAttributeValues: { ':status': status, ':updatedAt': updatedAt } }));
  return { ...existing, status, updatedAt };
}

export async function updateOrderPayment(orderId: string, payment: PesapalOrderPayment, status?: OrderStatus) {
  const existing = await getOrderById(orderId);
  if (!existing) return null;

  const updatedOrder = {
    ...existing,
    ...(status ? { status } : {}),
    pesapal: {
      ...(existing.pesapal || {}),
      ...payment,
      updatedAt: new Date().toISOString()
    },
    updatedAt: new Date().toISOString()
  };

  if (!getEnv().orderTableName) {
    const idx = memoryOrders.findIndex((order) => order.id === orderId);
    if (idx >= 0) memoryOrders[idx] = updatedOrder;
    return idx >= 0 ? memoryOrders[idx] : null;
  }

  const expressionAttributeNames: Record<string, string> = {
    '#pesapal': 'pesapal',
    '#updatedAt': 'updatedAt'
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ':pesapal': updatedOrder.pesapal,
    ':updatedAt': updatedOrder.updatedAt
  };
  let updateExpression = 'SET #pesapal = :pesapal, #updatedAt = :updatedAt';

  if (status) {
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = status;
    updateExpression += ', #status = :status';
  }

  await db.send(new UpdateCommand({
    TableName: getEnv().orderTableName,
    Key: { pk: `ORDER#${orderId}`, sk: existing.createdAt },
    UpdateExpression: updateExpression,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  }));

  return updatedOrder;
}


export async function updateOrderItemVendorFulfillmentStatus(orderId: string, productId: string, vendorId: string, vendorFulfillmentStatus: VendorFulfillmentStatus, flavourId?: string, customizationKey = '') {
  const existing = await getOrderById(orderId);
  if (!existing) return null;
  let changed = false;
  const updatedOrder = {
    ...existing,
    items: (existing.items || []).map((item) => {
      // Flavour and personalised messages are part of the line's identity: two
      // flavours (or messages) of one product from one vendor are two lines, and
      // marking one fulfilled must not mark the other.
      if (item.productId === productId && item.vendorId === vendorId && (item.flavourId || undefined) === (flavourId || undefined) && orderLineCustomizationKey(item) === customizationKey) {
        changed = true;
        return { ...item, vendorFulfillmentStatus };
      }
      return item;
    }),
    updatedAt: new Date().toISOString()
  };
  if (!changed) return null;
  if (!getEnv().orderTableName) {
    const idx = memoryOrders.findIndex((order) => order.id === orderId);
    if (idx >= 0) memoryOrders[idx] = updatedOrder;
    return idx >= 0 ? memoryOrders[idx] : null;
  }
  await db.send(new UpdateCommand({ TableName: getEnv().orderTableName, Key: { pk: `ORDER#${orderId}`, sk: existing.createdAt }, UpdateExpression: 'SET #items = :items, #updatedAt = :updatedAt', ExpressionAttributeNames: { '#items': 'items', '#updatedAt': 'updatedAt' }, ExpressionAttributeValues: { ':items': updatedOrder.items, ':updatedAt': updatedOrder.updatedAt } }));
  return updatedOrder;
}
