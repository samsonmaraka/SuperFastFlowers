import { DeleteCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import { UserRole, UserRoleAssignment, VendorAdminAssignment, VendorPermission } from '@/lib/auth-types';

const memoryRoles = new Map<string, UserRoleAssignment>();
const memoryVendorAssignments = new Map<string, VendorAdminAssignment>();

function roleKey(userId: string, role: UserRole) { return `${userId}:${role}`; }
function vendorKey(userId: string, vendorId: string) { return `${userId}:${vendorId}`; }

export async function getUserRoles(userId: string) {
  if (!isDynamoConfigured()) return [...memoryRoles.values()].filter((assignment) => assignment.userId === userId && assignment.status === 'active');
  const response = await db.send(new QueryCommand({ TableName: getEnv().tableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'ROLE#' } }));
  return ((response.Items || []) as UserRoleAssignment[]).filter((assignment) => assignment.status === 'active');
}

export async function grantUserRole(userId: string, role: UserRole, grantedByUserId?: string) {
  const assignment: UserRoleAssignment = { userId, role, status: 'active', grantedByUserId, grantedAt: new Date().toISOString() };
  if (!isDynamoConfigured()) { memoryRoles.set(roleKey(userId, role), assignment); return assignment; }
  await db.send(new PutCommand({ TableName: getEnv().tableName, Item: { ...assignment, entityType: 'USER_ROLE', pk: `USER#${userId}`, sk: `ROLE#${role}` } }));
  return assignment;
}

export async function revokeUserRole(userId: string, role: UserRole, revokedByUserId?: string) {
  const revokedAt = new Date().toISOString();
  if (!isDynamoConfigured()) {
    const existing = memoryRoles.get(roleKey(userId, role));
    if (!existing) return null;
    const next = { ...existing, status: 'revoked' as const, revokedByUserId, revokedAt };
    memoryRoles.set(roleKey(userId, role), next);
    return next;
  }
  await db.send(new UpdateCommand({ TableName: getEnv().tableName, Key: { pk: `USER#${userId}`, sk: `ROLE#${role}` }, UpdateExpression: 'SET #status = :status, revokedByUserId = :revokedByUserId, revokedAt = :revokedAt', ExpressionAttributeNames: { '#status': 'status' }, ExpressionAttributeValues: { ':status': 'revoked', ':revokedByUserId': revokedByUserId, ':revokedAt': revokedAt } }));
  return { userId, role, status: 'revoked' as const, grantedAt: '', revokedByUserId, revokedAt };
}

export async function getVendorAssignmentsForUser(userId: string) {
  if (!isDynamoConfigured()) return [...memoryVendorAssignments.values()].filter((assignment) => assignment.userId === userId && assignment.status === 'active');
  const response = await db.send(new QueryCommand({ TableName: getEnv().tableName, KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)', ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'VENDOR#' } }));
  return ((response.Items || []) as VendorAdminAssignment[]).filter((assignment) => assignment.status === 'active');
}

export async function assignVendorToUser(userId: string, vendorId: string, permissions: VendorPermission[] = ['VIEW_ORDERS'], assignedByUserId?: string) {
  const now = new Date().toISOString();
  const assignment: VendorAdminAssignment = { userId, vendorId, permissions, status: 'active', assignedByUserId, assignedAt: now, updatedAt: now };
  if (!isDynamoConfigured()) { memoryVendorAssignments.set(vendorKey(userId, vendorId), assignment); return assignment; }
  await db.send(new PutCommand({ TableName: getEnv().tableName, Item: { ...assignment, entityType: 'VENDOR_ADMIN_ASSIGNMENT', pk: `USER#${userId}`, sk: `VENDOR#${vendorId}` } }));
  return assignment;
}

export async function removeVendorAssignment(userId: string, vendorId: string) {
  if (!isDynamoConfigured()) return memoryVendorAssignments.delete(vendorKey(userId, vendorId));
  await db.send(new DeleteCommand({ TableName: getEnv().tableName, Key: { pk: `USER#${userId}`, sk: `VENDOR#${vendorId}` } }));
  return true;
}
