import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DeleteCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import { Addon } from '@/lib/types';
import { seedAddons } from '@/data/seed-addons';

const localAddonsPath = path.join(process.cwd(), 'data', '.local-addons.json');

async function loadLocalAddons(): Promise<Addon[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(localAddonsPath, 'utf8')) as Addon[];
    return Array.isArray(parsed) ? parsed : [...seedAddons];
  } catch {
    return [...seedAddons];
  }
}

async function persist(addons: Addon[]) {
  await fs.writeFile(localAddonsPath, JSON.stringify(addons, null, 2), 'utf8');
}

function sortAddons(addons: Addon[]) {
  return addons.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name));
}

export async function listAddons(options?: { includeInactive?: boolean }) {
  const { includeInactive = false } = options || {};
  const addons = !isDynamoConfigured()
    ? await loadLocalAddons()
    : (((await db.send(
        new ScanCommand({
          TableName: getEnv().tableName,
          FilterExpression: '#entity = :entity',
          ExpressionAttributeNames: { '#entity': 'entityType' },
          ExpressionAttributeValues: { ':entity': 'ADDON' }
        })
      )).Items || []) as Addon[]);

  return sortAddons(addons.filter((addon) => includeInactive || (addon.status ?? 'active') === 'active'));
}

export async function getAddon(id: string) {
  if (!isDynamoConfigured()) return (await loadLocalAddons()).find((addon) => addon.id === id) || null;
  const res = await db.send(new GetCommand({ TableName: getEnv().tableName, Key: { pk: `ADDON#${id}`, sk: 'META' } }));
  return (res.Item as Addon | undefined) || null;
}

export async function upsertAddon(addon: Addon) {
  if (!isDynamoConfigured()) {
    const addons = await loadLocalAddons();
    await persist([...addons.filter((a) => a.id !== addon.id), addon]);
    return addon;
  }
  await db.send(
    new PutCommand({ TableName: getEnv().tableName, Item: { ...addon, entityType: 'ADDON', pk: `ADDON#${addon.id}`, sk: 'META' } })
  );
  return addon;
}

export async function deleteAddon(id: string) {
  if (!isDynamoConfigured()) {
    const addons = await loadLocalAddons();
    await persist(addons.filter((addon) => addon.id !== id));
    return;
  }
  await db.send(new DeleteCommand({ TableName: getEnv().tableName, Key: { pk: `ADDON#${id}`, sk: 'META' } }));
}
