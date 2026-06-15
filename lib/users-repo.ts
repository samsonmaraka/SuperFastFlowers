import { GetCommand, PutCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import { AppUser } from '@/lib/auth-types';

const memoryUsers = new Map<string, AppUser>();

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getUserById(userId: string) {
  if (!isDynamoConfigured()) return memoryUsers.get(userId) || null;
  const response = await db.send(new GetCommand({ TableName: getEnv().tableName, Key: { pk: `USER#${userId}`, sk: 'PROFILE' } }));
  return (response.Item as AppUser | undefined) || null;
}

export async function getUserByEmail(email: string) {
  const emailNormalized = normalizeEmail(email);
  if (!isDynamoConfigured()) return [...memoryUsers.values()].find((user) => user.emailNormalized === emailNormalized) || null;
  const response = await db.send(new QueryCommand({
    TableName: getEnv().tableName,
    IndexName: getEnv().productSlugIndexName,
    KeyConditionExpression: 'gsi1pk = :gsi1pk',
    ExpressionAttributeValues: { ':gsi1pk': `USER_EMAIL#${emailNormalized}` },
    Limit: 1
  }));
  return ((response.Items || [])[0] as AppUser | undefined) || null;
}

export async function upsertUserProfile(user: AppUser) {
  const now = new Date().toISOString();
  const existing = await getUserById(user.userId);
  const nextUser: AppUser = {
    ...user,
    emailNormalized: normalizeEmail(user.emailNormalized || user.email),
    createdAt: user.createdAt || existing?.createdAt || now,
    updatedAt: now
  };

  if (!isDynamoConfigured()) {
    memoryUsers.set(nextUser.userId, nextUser);
    return nextUser;
  }

  await db.send(new PutCommand({
    TableName: getEnv().tableName,
    Item: {
      ...nextUser,
      entityType: 'USER',
      pk: `USER#${nextUser.userId}`,
      sk: 'PROFILE',
      gsi1pk: `USER_EMAIL#${nextUser.emailNormalized}`,
      gsi1sk: `USER#${nextUser.userId}`
    }
  }));
  return nextUser;
}


export async function listUsers(search?: string) {
  const normalizedSearch = search ? normalizeEmail(search) : '';
  let users: AppUser[];
  if (!isDynamoConfigured()) {
    users = [...memoryUsers.values()];
  } else {
    const response = await db.send(new ScanCommand({
      TableName: getEnv().tableName,
      FilterExpression: 'entityType = :entityType',
      ExpressionAttributeValues: { ':entityType': 'USER' }
    }));
    users = (response.Items || []) as AppUser[];
  }
  const filtered = normalizedSearch
    ? users.filter((user) => user.emailNormalized.includes(normalizedSearch) || (user.name || '').toLowerCase().includes(normalizedSearch))
    : users;
  return filtered.sort((a, b) => (b.lastLoginAt || b.updatedAt).localeCompare(a.lastLoginAt || a.updatedAt));
}
