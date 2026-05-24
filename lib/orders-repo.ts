import { PutCommand, QueryCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv } from '@/lib/env';
import { OrderRequest, OrderStatus } from '@/lib/types';

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
    if (idx >= 0) memoryOrders[idx] = { ...memoryOrders[idx], status };
    return idx >= 0 ? memoryOrders[idx] : null;
  }
  await db.send(new UpdateCommand({ TableName: getEnv().orderTableName, Key: { pk: `ORDER#${orderId}`, sk: existing.createdAt }, UpdateExpression: 'SET #status = :status', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': status } }));
  return { ...existing, status };
}
