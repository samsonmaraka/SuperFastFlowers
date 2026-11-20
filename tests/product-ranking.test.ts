import assert from 'node:assert/strict';
import {
  mulberry32,
  parseRankingSeed,
  rankProductsByEngagement,
  sampleBeta,
  siteAverageRate,
  type ProductEngagement
} from '../lib/product-ranking';

const products = Array.from({ length: 12 }, (_, index) => ({ id: `p${index}` }));
const SEEDS = Array.from({ length: 400 }, (_, index) => index + 1);

function topSlotShare(stats: Map<string, ProductEngagement>, productId: string, slots: number) {
  let hits = 0;
  for (const seed of SEEDS) {
    const order = rankProductsByEngagement(products, stats, { seed });
    if (order.slice(0, slots).some((product) => product.id === productId)) hits += 1;
  }
  return hits / SEEDS.length;
}

// Beta sampler is roughly unbiased.
{
  const random = mulberry32(42);
  let sum = 0;
  const draws = 20000;
  for (let i = 0; i < draws; i += 1) sum += sampleBeta(2, 8, random);
  assert.ok(Math.abs(sum / draws - 0.2) < 0.01, `beta(2,8) mean was ${sum / draws}`);

  let smallShapeSum = 0;
  for (let i = 0; i < draws; i += 1) smallShapeSum += sampleBeta(0.5, 0.5, random);
  assert.ok(Math.abs(smallShapeSum / draws - 0.5) < 0.02, 'beta with shapes below 1 is unbiased');
}

// Same visitor seed gives the same order; the ranking keeps every product.
{
  const stats = new Map<string, ProductEngagement>([['p3', { impressions: 40, views: 10, addsToCart: 2 }]]);
  const a = rankProductsByEngagement(products, stats, { seed: 7 }).map((p) => p.id);
  const b = rankProductsByEngagement(products, stats, { seed: 7 }).map((p) => p.id);
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort(), products.map((p) => p.id).sort());
}

// With no data at all, every product gets roughly an equal turn in the top row.
{
  const stats = new Map<string, ProductEngagement>();
  for (const product of products) {
    const share = topSlotShare(stats, product.id, 3);
    // Fair share is 3/12 = 25%.
    assert.ok(share > 0.15 && share < 0.35, `${product.id} top-3 share with no data was ${share}`);
  }
}

// A clear winner usually takes the top row; a clear loser rarely does; an
// untested product still gets tried there regularly.
{
  const stats = new Map<string, ProductEngagement>();
  for (const product of products) stats.set(product.id, { impressions: 200, views: 10, addsToCart: 0 });
  stats.set('p0', { impressions: 200, views: 50, addsToCart: 10 }); // winner
  stats.set('p1', { impressions: 400, views: 2, addsToCart: 0 }); // shown a lot, ignored
  stats.delete('p2'); // brand new product

  const winner = topSlotShare(stats, 'p0', 3);
  const loser = topSlotShare(stats, 'p1', 3);
  const newcomer = topSlotShare(stats, 'p2', 3);

  assert.ok(winner > 0.95, `winner top-3 share was ${winner}`);
  assert.ok(loser < 0.02, `ignored product top-3 share was ${loser}`);
  assert.ok(newcomer > 0.1, `new product top-3 share was ${newcomer}`);
}

// Site average falls back to 5% until there is enough data.
assert.equal(siteAverageRate([{ impressions: 10, views: 5, addsToCart: 0 }]), 0.05);
assert.ok(Math.abs(siteAverageRate([{ impressions: 100, views: 10, addsToCart: 0 }]) - 0.1) < 1e-9);

// Seed cookie parsing rejects junk.
assert.equal(parseRankingSeed('12345'), 12345);
assert.equal(parseRankingSeed('abc'), null);
assert.equal(parseRankingSeed('99999999999'), null);
assert.equal(parseRankingSeed(undefined), null);

console.log('product ranking tests passed');
