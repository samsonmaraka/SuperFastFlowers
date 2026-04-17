import { PutCommand } from '@aws-sdk/lib-dynamodb';
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
