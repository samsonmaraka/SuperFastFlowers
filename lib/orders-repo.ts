import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv } from '@/lib/env';
import { OrderRequest } from '@/lib/types';

const memoryOrders: OrderRequest[] = [];

export async function createOrder(order: OrderRequest) {
  if (!getEnv().orderTableName) {
    memoryOrders.push(order);
    return order;
  }

  await db.send(
    new PutCommand({
      TableName: getEnv().orderTableName,
      Item: {
        ...order,
        pk: `ORDER#${order.id}`,
        sk: order.createdAt
      }
    })
  );

  return order;
}

export async function getOrderById(orderId: string) {
  if (!getEnv().orderTableName) {
    return memoryOrders.find((order) => order.id === orderId) || null;
  }

  const pk = `ORDER#${orderId}`;
  console.info('[orders-repo] getOrderById lookup', { pk, sk: 'LATEST_BY_PK' });

  const response = await db.send(
    new QueryCommand({
      TableName: getEnv().orderTableName,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': pk
      },
      Limit: 1,
      ScanIndexForward: false
    })
  );

  return ((response.Items || [])[0] as OrderRequest | undefined) || null;
}
