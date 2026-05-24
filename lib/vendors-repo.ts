import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import { Vendor } from '@/lib/types';

const localVendorsPath = path.join(process.cwd(), 'data', '.local-vendors.json');

async function loadLocalVendors(): Promise<Vendor[]> {
  try { return JSON.parse(await fs.readFile(localVendorsPath, 'utf8')) as Vendor[]; } catch { return []; }
}
async function persist(vendors: Vendor[]) { await fs.writeFile(localVendorsPath, JSON.stringify(vendors, null, 2), 'utf8'); }

export async function listVendors() {
  const vendors = !isDynamoConfigured()
    ? await loadLocalVendors()
    : ((await db.send(new ScanCommand({ TableName: getEnv().tableName, FilterExpression: '#entity = :entity', ExpressionAttributeNames: { '#entity': 'entityType' }, ExpressionAttributeValues: { ':entity': 'VENDOR' } }))).Items || []) as Vendor[];
  return vendors.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getVendor(id: string) {
  if (!isDynamoConfigured()) return (await loadLocalVendors()).find((v) => v.id === id) || null;
  const res = await db.send(new GetCommand({ TableName: getEnv().tableName, Key: { pk: `VENDOR#${id}`, sk: 'META' } }));
  return (res.Item as Vendor | undefined) || null;
}

export async function upsertVendor(vendor: Vendor) {
  if (!isDynamoConfigured()) {
    const vendors = await loadLocalVendors();
    await persist([...vendors.filter((v) => v.id !== vendor.id), vendor]);
    return vendor;
  }
  await db.send(new PutCommand({ TableName: getEnv().tableName, Item: { ...vendor, entityType: 'VENDOR', pk: `VENDOR#${vendor.id}`, sk: 'META' } }));
  return vendor;
}

export async function deleteVendor(id: string) {
  if (!isDynamoConfigured()) {
    const vendors = await loadLocalVendors();
    await persist(vendors.filter((v) => v.id !== id));
    return;
  }
  await db.send(new DeleteCommand({ TableName: getEnv().tableName, Key: { pk: `VENDOR#${id}`, sk: 'META' } }));
}
