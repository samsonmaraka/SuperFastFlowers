const awsRegion = process.env.REGION || process.env.AWS_REGION || 'eu-north-1';

export const env = {
  awsRegion,
  tableName: process.env.DYNAMODB_TABLE || '',
  orderTableName: process.env.DYNAMODB_ORDER_TABLE || '',
  adminToken: process.env.ADMIN_TOKEN || 'samsonmaraka'
};

export const isDynamoConfigured = Boolean(env.tableName);
