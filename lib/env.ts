function readServerEnv() {
  const awsRegion = process.env.REGION || process.env.AWS_REGION || 'eu-north-1';

  return {
    awsRegion,
    tableName: process.env.DYNAMODB_TABLE || '',
    orderTableName: process.env.DYNAMODB_ORDER_TABLE || '',
    productSlugIndexName: process.env.DYNAMODB_PRODUCT_SLUG_INDEX || 'giftora_main_index',
    adminToken: process.env.ADMIN_TOKEN || 'samsonmaraka',
    pesapalConsumerKey: process.env.PESAPAL_CONSUMER_KEY || '',
    pesapalConsumerSecret: process.env.PESAPAL_CONSUMER_SECRET || '',
    pesapalBaseUrl: (process.env.PESAPAL_BASE_URL || '').replace(/\/$/, ''),
    pesapalIpnId: process.env.PESAPAL_IPN_ID || '',
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  };
}

export function getEnv() {
  return readServerEnv();
}

export function isDynamoConfigured() {
  return Boolean(readServerEnv().tableName);
}
