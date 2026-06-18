export type GiftCategory = {
  rank: number;
  label: string;
  slug: string;
  description?: string;
};

export const giftCategories: GiftCategory[] = [
  { rank: 10, label: 'Cakes and Cupcakes', slug: 'cakes-and-cupcakes' },
  { rank: 20, label: "Valentine's Day", slug: 'valentines-day' },
  { rank: 30, label: 'Baby Shower', slug: 'baby-shower' },
  { rank: 40, label: 'New Baby', slug: 'new-baby' },
  { rank: 50, label: 'Congratulations', slug: 'congratulations' },
  { rank: 60, label: 'Birthday', slug: 'birthday' },
  { rank: 70, label: 'Thank You', slug: 'thank-you' },
  { rank: 80, label: 'Gift Baskets and Food', slug: 'gift-baskets-and-food' },
  { rank: 90, label: 'Flowers', slug: 'flowers' },
  { rank: 100, label: 'Anniversary', slug: 'anniversary' },
  { rank: 110, label: 'Christmas', slug: 'christmas' }
];

export function getSortedGiftCategories() {
  return [...giftCategories].sort((a, b) => a.rank - b.rank);
}
