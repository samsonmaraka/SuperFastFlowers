import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { env } from '@/lib/env';
import { OrderRequest } from '@/lib/types';

const memoryOrders: OrderRequest[] = [];

export async function createOrder(order: OrderRequest) {
  if (!env.orderTableName) {
    memoryOrders.push(order);
    return order;
  }

  await db.send(
    new PutCommand({
      TableName: env.orderTableName,
      Item: {
        ...order,
        pk: `ORDER#${order.id}`,
        sk: order.createdAt
      }
    })
  );

  return order;
}
