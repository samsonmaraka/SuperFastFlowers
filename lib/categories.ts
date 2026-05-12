export type GiftCategory = {
  rank: number;
  label: string;
  slug: string;
  description?: string;
};

export const giftCategories: GiftCategory[] = [
  { rank: 10, label: "Mother's Day", slug: 'mothers-day' },
  { rank: 20, label: 'Birthday', slug: 'birthday' },
  { rank: 30, label: 'Occasions', slug: 'occasions' },
  { rank: 40, label: 'Sympathy', slug: 'sympathy' },
  { rank: 50, label: 'Get Well', slug: 'get-well' },
  { rank: 60, label: 'Flowers', slug: 'flowers' },
  { rank: 70, label: 'Plants', slug: 'plants' },
  { rank: 80, label: 'Gift Baskets and Food', slug: 'gift-baskets-food' }
];

export function getSortedGiftCategories() {
  return [...giftCategories].sort((a, b) => a.rank - b.rank);
}
