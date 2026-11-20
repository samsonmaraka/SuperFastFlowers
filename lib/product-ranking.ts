// Orders product grids so that products shoppers respond to rise to the top,
// while products with little data still get regular turns near the top.
//
// Method: Thompson sampling. Each product's "interest rate" (product-page views
// and add-to-carts per time its card was seen) is uncertain, so it is modelled as
// a Beta distribution. On every page render we draw one plausible rate per
// product and sort by the draws:
//   - a product with lots of evidence of a high rate draws high almost every time
//     and so usually sits near the top;
//   - a product with little or no data has a wide distribution, so it sometimes
//     draws high and gets tried in a top slot;
//   - a product that has been shown plenty and ignored draws low and sinks.
// The draws come from a seeded generator, so a visitor sees a stable order while
// browsing rather than a reshuffle on every click back to the shop.
//
// This file has no server or AWS imports so it can be unit tested directly.

export type ProductEngagement = {
  // Times the product card was actually on screen in a grid.
  impressions: number;
  // Product-page views (from the grid, search, Google, a shared link...).
  views: number;
  addsToCart: number;
};

export type RankingOptions = {
  seed: number;
  // How much an add-to-cart counts relative to a product-page view.
  addToCartWeight?: number;
  // How many impressions' worth of weight the site-wide average carries for a
  // product with no data. Lower = new products swing more wildly.
  priorStrength?: number;
};

const DEFAULT_ADD_TO_CART_WEIGHT = 2;
const DEFAULT_PRIOR_STRENGTH = 20;
// Used until the site has enough impressions to measure its own average rate.
const FALLBACK_PRIOR_RATE = 0.05;
const MIN_IMPRESSIONS_FOR_SITE_RATE = 50;

export const EMPTY_ENGAGEMENT: ProductEngagement = { impressions: 0, views: 0, addsToCart: 0 };

// ---------- seeded randomness ----------

export function hashString(value: string) {
  // FNV-1a, 32-bit.
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleStandardNormal(random: () => number) {
  // Box-Muller; 1 - random() keeps the log argument above zero.
  const u1 = 1 - random();
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleGamma(shape: number, random: () => number): number {
  // Marsaglia-Tsang. Shapes below 1 use the standard boost.
  if (shape < 1) {
    return sampleGamma(shape + 1, random) * Math.pow(1 - random(), 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = sampleStandardNormal(random);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = 1 - random();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(alpha: number, beta: number, random: () => number) {
  const x = sampleGamma(alpha, random);
  const y = sampleGamma(beta, random);
  return x / (x + y);
}

// ---------- scoring ----------

function successesAndTrials(engagement: ProductEngagement, addToCartWeight: number) {
  const successes = Math.max(0, engagement.views) + addToCartWeight * Math.max(0, engagement.addsToCart);
  // Views can come from outside the grid (Google, shared links), so a product
  // can have more "successes" than impressions. Treat those as trials too.
  const trials = Math.max(Math.max(0, engagement.impressions), successes);
  return { successes, trials };
}

export function siteAverageRate(allEngagement: ProductEngagement[], addToCartWeight = DEFAULT_ADD_TO_CART_WEIGHT) {
  let totalSuccesses = 0;
  let totalTrials = 0;
  let totalImpressions = 0;

  for (const engagement of allEngagement) {
    const { successes, trials } = successesAndTrials(engagement, addToCartWeight);
    totalSuccesses += successes;
    totalTrials += trials;
    totalImpressions += Math.max(0, engagement.impressions);
  }

  if (totalImpressions < MIN_IMPRESSIONS_FOR_SITE_RATE || totalTrials === 0) return FALLBACK_PRIOR_RATE;
  return Math.min(0.5, Math.max(0.01, totalSuccesses / totalTrials));
}

export function rankProductsByEngagement<T extends { id: string }>(
  products: T[],
  engagementById: Map<string, ProductEngagement>,
  options: RankingOptions
): T[] {
  const addToCartWeight = options.addToCartWeight ?? DEFAULT_ADD_TO_CART_WEIGHT;
  const priorStrength = options.priorStrength ?? DEFAULT_PRIOR_STRENGTH;
  const priorRate = siteAverageRate(
    products.map((product) => engagementById.get(product.id) ?? EMPTY_ENGAGEMENT),
    addToCartWeight
  );
  const priorAlpha = priorRate * priorStrength;
  const priorBeta = (1 - priorRate) * priorStrength;

  const scored = products.map((product, index) => {
    const { successes, trials } = successesAndTrials(engagementById.get(product.id) ?? EMPTY_ENGAGEMENT, addToCartWeight);
    // One generator per product, so adding or removing a product does not
    // reshuffle everyone else's draw for the same visitor.
    const random = mulberry32(hashString(`${options.seed}:${product.id}`));
    const score = sampleBeta(priorAlpha + successes, priorBeta + (trials - successes), random);
    return { product, score, index };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map((entry) => entry.product);
}

// ---------- visitor seed ----------

export const RANKING_SEED_COOKIE = 'sg_rank_seed';
// How long one visitor keeps the same order before it is re-drawn.
export const RANKING_SEED_MAX_AGE_SECONDS = 12 * 60 * 60;

export function parseRankingSeed(value: string | undefined | null) {
  if (!value || !/^\d{1,10}$/.test(value)) return null;
  const seed = Number(value);
  return seed <= 0xffffffff ? seed : null;
}

export function newRankingSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
