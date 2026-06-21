export type GiftCategory = {
  rank: number;
  label: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  h1?: string;
  intro?: string;
  relatedCategories?: string[];
};

export const giftCategories: GiftCategory[] = [
  {
    rank: 10,
    label: 'Cakes and Cupcakes',
    slug: 'cakes-and-cupcakes',
    seoTitle: 'Cakes and Cupcakes in Uganda | Sendagift UG',
    seoDescription: 'Order cakes and cupcakes in Uganda for birthdays, baby showers, congratulations, love and everyday celebrations with Sendagift UG.',
    h1: 'Cakes and Cupcakes in Uganda',
    intro: 'Shop cakes and cupcakes for thoughtful celebrations across Uganda. Find sweet gifts for birthdays, new babies, baby showers, romantic surprises and congratulations moments.',
    relatedCategories: ['birthday', 'baby-shower', 'congratulations']
  },
  {
    rank: 20,
    label: "Valentine's Day",
    slug: 'valentines-day',
    seoTitle: "Valentine's Day Gifts in Uganda | Sendagift UG",
    seoDescription: "Send Valentine's Day gifts in Uganda, including cakes, flowers, hampers and romantic surprises for someone special.",
    h1: "Valentine's Day Gifts in Uganda",
    intro: "Celebrate love with Valentine's Day gifts that feel personal and memorable. Browse romantic cakes, flowers, hampers and thoughtful surprises for delivery in Uganda.",
    relatedCategories: ['flowers', 'cakes-and-cupcakes', 'anniversary']
  },
  {
    rank: 30,
    label: 'Baby Shower',
    slug: 'baby-shower',
    seoTitle: 'Baby Shower Gifts in Uganda | Sendagift UG',
    seoDescription: 'Shop baby shower gifts in Uganda, from celebration cakes to thoughtful hampers and gifts for parents-to-be.',
    h1: 'Baby Shower Gifts in Uganda',
    intro: 'Find baby shower gifts that help parents-to-be feel celebrated. Choose from cakes, hampers and thoughtful gifts for a warm welcome before the baby arrives.',
    relatedCategories: ['new-baby', 'cakes-and-cupcakes', 'congratulations']
  },
  {
    rank: 40,
    label: 'New Baby',
    slug: 'new-baby',
    seoTitle: 'New Baby Gifts in Uganda | Sendagift UG',
    seoDescription: 'Send new baby gifts in Uganda for newborn celebrations, hospital visits and thoughtful congratulations for new parents.',
    h1: 'New Baby Gifts in Uganda',
    intro: 'Welcome a newborn with gifts for the baby and parents. Browse thoughtful new baby gifts, celebration treats and congratulations ideas for families in Uganda.',
    relatedCategories: ['baby-shower', 'congratulations', 'cakes-and-cupcakes']
  },
  {
    rank: 50,
    label: 'Congratulations',
    slug: 'congratulations',
    seoTitle: 'Congratulations Gifts in Uganda | Sendagift UG',
    seoDescription: 'Send congratulations gifts in Uganda for graduations, promotions, new babies, engagements and special achievements.',
    h1: 'Congratulations Gifts in Uganda',
    intro: 'Mark achievements and happy news with congratulations gifts that feel thoughtful. Shop cakes, flowers, hampers and celebration gifts for delivery in Uganda.',
    relatedCategories: ['flowers', 'cakes-and-cupcakes', 'new-baby']
  },
  {
    rank: 60,
    label: 'Birthday',
    slug: 'birthday',
    seoTitle: 'Birthday Gifts in Uganda | Sendagift UG',
    seoDescription: 'Shop birthday gifts in Uganda, including cakes, cupcakes, flowers, hampers and thoughtful surprises for every age and celebration.',
    h1: 'Birthday Gifts in Uganda',
    intro: 'Make birthdays easier to celebrate with gifts that can be ordered online in Uganda. Browse cakes, cupcakes, flowers, hampers and thoughtful birthday surprises.',
    relatedCategories: ['cakes-and-cupcakes', 'flowers', 'gift-baskets-and-food']
  },
  { rank: 70, label: 'Thank You', slug: 'thank-you' },
  { rank: 80, label: 'Gift Baskets and Food', slug: 'gift-baskets-and-food' },
  { rank: 90, label: 'Flowers', slug: 'flowers' },
  { rank: 100, label: 'Anniversary', slug: 'anniversary' },
  { rank: 110, label: 'Christmas', slug: 'christmas' }
];

export function normalizeCategorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getSortedGiftCategories() {
  return [...giftCategories].sort((a, b) => a.rank - b.rank);
}

export function getGiftCategoryBySlug(slug: string) {
  const normalizedSlug = normalizeCategorySlug(slug);
  return giftCategories.find((category) => normalizeCategorySlug(category.slug) === normalizedSlug) || null;
}

export function categoryPath(category: Pick<GiftCategory, 'slug'>) {
  return `/shop/category/${category.slug}`;
}
