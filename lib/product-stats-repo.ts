import 'server-only';

import { QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getEnv, isDynamoConfigured } from '@/lib/env';
import {
  EMPTY_ENGAGEMENT,
  newRankingSeed,
  rankProductsByEngagement,
  type ProductEngagement
} from '@/lib/product-ranking';

// First-party engagement counts that drive the shop's product order.
//
// Stored in the main table, one item per product per month:
//   pk = PRODUCT_STATS#2026-11   sk = PRODUCT#<productId>
// so a month's counts for every product come back from a single Query.
// Older months count for less (see MONTH_WEIGHTS), so the order follows what
// shoppers want now (Christmas in December, roses in February) rather than
// what they wanted last season.

export type ProductEventType = 'impression' | 'view' | 'add_to_cart';

export type ProductEventCounts = Record<string, ProductEngagement>;

// This month, last month, the month before.
const MONTH_WEIGHTS = [1, 0.5, 0.25];
const STATS_CACHE_TTL_MS = 60_000;

const memoryStats = new Map<string, ProductEngagement>();
let statsCache: { loadedAt: number; stats: Map<string, ProductEngagement> } | null = null;

export function statsMonthKey(date: Date, monthsAgo = 0) {
  const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - monthsAgo, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

function statsPk(month: string) {
  return `PRODUCT_STATS#${month}`;
}

export async function recordProductEvents(counts: ProductEventCounts, now = new Date()) {
  const month = statsMonthKey(now);
  const entries = Object.entries(counts).filter(
    ([, c]) => c.impressions > 0 || c.views > 0 || c.addsToCart > 0
  );

  if (!isDynamoConfigured()) {
    for (const [productId, c] of entries) {
      const key = `${month}:${productId}`;
      const current = memoryStats.get(key) ?? { ...EMPTY_ENGAGEMENT };
      memoryStats.set(key, {
        impressions: current.impressions + c.impressions,
        views: current.views + c.views,
        addsToCart: current.addsToCart + c.addsToCart
      });
    }
    statsCache = null;
    return;
  }

  await Promise.all(
    entries.map(([productId, c]) =>
      db.send(
        new UpdateCommand({
          TableName: getEnv().tableName,
          Key: { pk: statsPk(month), sk: `PRODUCT#${productId}` },
          UpdateExpression:
            'ADD impressions :impressions, #views :views, addsToCart :adds SET entityType = :entity, productId = :productId, #month = :month, updatedAt = :now',
          ExpressionAttributeNames: { '#views': 'views', '#month': 'month' },
          ExpressionAttributeValues: {
            ':impressions': c.impressions,
            ':views': c.views,
            ':adds': c.addsToCart,
            ':entity': 'PRODUCT_STATS',
            ':productId': productId,
            ':month': month,
            ':now': now.toISOString()
          }
        })
      )
    )
  );
}

async function loadMonth(month: string) {
  const byProduct = new Map<string, ProductEngagement>();

  if (!isDynamoConfigured()) {
    for (const [key, value] of memoryStats) {
      const [keyMonth, productId] = key.split(':');
      if (keyMonth === month) byProduct.set(productId, value);
    }
    return byProduct;
  }

  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await db.send(
      new QueryCommand({
        TableName: getEnv().tableName,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': statsPk(month) },
        ExclusiveStartKey: exclusiveStartKey
      })
    );
    for (const item of res.Items || []) {
      const productId = String(item.productId || String(item.sk || '').replace(/^PRODUCT#/, ''));
      byProduct.set(productId, {
        impressions: Number(item.impressions || 0),
        views: Number(item.views || 0),
        addsToCart: Number(item.addsToCart || 0)
      });
    }
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return byProduct;
}

export async function getWeightedProductStats(now = new Date()) {
  if (statsCache && Date.now() - statsCache.loadedAt < STATS_CACHE_TTL_MS) return statsCache.stats;

  const months = await Promise.all(MONTH_WEIGHTS.map((_, monthsAgo) => loadMonth(statsMonthKey(now, monthsAgo))));
  const combined = new Map<string, ProductEngagement>();

  months.forEach((month, index) => {
    const weight = MONTH_WEIGHTS[index];
    for (const [productId, c] of month) {
      const current = combined.get(productId) ?? { ...EMPTY_ENGAGEMENT };
      combined.set(productId, {
        impressions: current.impressions + weight * c.impressions,
        views: current.views + weight * c.views,
        addsToCart: current.addsToCart + weight * c.addsToCart
      });
    }
  });

  statsCache = { loadedAt: Date.now(), stats: combined };
  return combined;
}

// Never lets a stats problem break the shop: on any error the grid keeps its
// existing order.
export async function rankProductsForVisitor<T extends { id: string }>(products: T[], seed: number | null) {
  if (products.length < 2) return products;
  try {
    const stats = await getWeightedProductStats();
    return rankProductsByEngagement(products, stats, { seed: seed ?? newRankingSeed() });
  } catch (error) {
    console.error('[product-stats] ranking failed; showing unranked products', error);
    return products;
  }
}
