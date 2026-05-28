import { PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv } from '@/lib/env';
import { OrderRequest, OrderStatus, PesapalOrderPayment } from '@/lib/types';

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
  const orderId = merchantReference.replace(/^GIFTORA-/, '');
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
