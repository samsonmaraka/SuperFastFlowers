export const env = {
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  tableName: process.env.DYNAMODB_TABLE || '',
  orderTableName: process.env.DYNAMODB_ORDER_TABLE || '',
  adminToken: process.env.ADMIN_TOKEN || 'dev-admin-token'
};

export const isDynamoConfigured = Boolean(env.tableName);
