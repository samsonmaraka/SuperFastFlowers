function readServerEnv() {
  const awsRegion = process.env.REGION || process.env.AWS_REGION || 'eu-north-1';

  return {
    awsRegion,
    tableName: process.env.DYNAMODB_TABLE || '',
    orderTableName: process.env.DYNAMODB_ORDER_TABLE || '',
    adminToken: process.env.ADMIN_TOKEN || 'samsonmaraka'
  };
}

export function getEnv() {
  return readServerEnv();
}

export function isDynamoConfigured() {
  return Boolean(readServerEnv().tableName);
}
