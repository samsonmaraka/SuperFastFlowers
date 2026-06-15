import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import { AuditLogEntry } from '@/lib/auth-types';

const memoryAuditLogs: AuditLogEntry[] = [];

export async function writeAuditLog(entry: AuditLogEntry) {
  const nextEntry = { ...entry, auditId: entry.auditId || crypto.randomUUID(), createdAt: entry.createdAt || new Date().toISOString() };
  if (!isDynamoConfigured()) { memoryAuditLogs.push(nextEntry); return nextEntry; }
  await db.send(new PutCommand({ TableName: getEnv().tableName, Item: { ...nextEntry, entityType: 'AUDIT_LOG', pk: `AUDIT#${nextEntry.auditId}`, sk: nextEntry.createdAt, gsi1pk: nextEntry.actorUserId ? `USER#${nextEntry.actorUserId}` : 'SYSTEM', gsi1sk: nextEntry.createdAt } }));
  return nextEntry;
}
