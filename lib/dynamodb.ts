import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from '@/lib/env';

const region = env.awsRegion;
const client = new DynamoDBClient({ region });

export const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});
