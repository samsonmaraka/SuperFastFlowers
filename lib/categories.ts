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
    seoTitle: 'Cake and Cupcake Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send cake and cupcake gifts in Uganda for birthdays, baby showers, congratulations, love, and everyday celebrations.',
    h1: 'Cakes and Cupcakes in Uganda',
    intro: 'Shop cakes and cupcakes for thoughtful celebrations across Uganda. Find sweet gifts for birthdays, new babies, baby showers, romantic surprises and congratulations moments.',
    relatedCategories: ['birthday', 'baby-shower', 'congratulations']
  },
  {
    rank: 20,
    label: "Valentine's Day",
    slug: 'valentines-day',
    seoTitle: "Valentine's Day Gifts in Uganda | Sendagift UG",
    seoDescription: "Sendagift UG helps you send Valentine's Day gifts in Uganda, including cakes, flowers, hampers and romantic surprises for someone special.",
    h1: "Valentine's Day Gifts in Uganda",
    intro: "Celebrate love with Valentine's Day gifts that feel personal and memorable. Browse romantic cakes, flowers, hampers and thoughtful surprises for delivery in Uganda.",
    relatedCategories: ['flowers', 'cakes-and-cupcakes', 'anniversary']
  },
  {
    rank: 30,
    label: 'Baby Shower',
    slug: 'baby-shower',
    seoTitle: 'Baby Shower Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send baby shower gifts in Uganda, including cakes, hampers, cupcakes, flowers, and thoughtful gifts for parents-to-be.',
    h1: 'Baby Shower Gifts in Uganda',
    intro: 'Find baby shower gifts that help parents-to-be feel celebrated. Choose from cakes, hampers and thoughtful gifts for a warm welcome before the baby arrives.',
    relatedCategories: ['new-baby', 'cakes-and-cupcakes', 'congratulations']
  },
  {
    rank: 40,
    label: 'New Baby',
    slug: 'new-baby',
    seoTitle: 'New Baby Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send new baby gifts in Uganda for newborn celebrations, hospital visits and thoughtful congratulations for new parents.',
    h1: 'New Baby Gifts in Uganda',
    intro: 'Welcome a newborn with gifts for the baby and parents. Browse thoughtful new baby gifts, celebration treats and congratulations ideas for families in Uganda.',
    relatedCategories: ['baby-shower', 'congratulations', 'cakes-and-cupcakes']
  },
  {
    rank: 50,
    label: 'Congratulations',
    slug: 'congratulations',
    seoTitle: 'Congratulations Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send congratulations gifts in Uganda for graduations, promotions, new babies, engagements and special achievements.',
    h1: 'Congratulations Gifts in Uganda',
    intro: 'Mark achievements and happy news with congratulations gifts that feel thoughtful. Shop cakes, flowers, hampers and celebration gifts for delivery in Uganda.',
    relatedCategories: ['flowers', 'cakes-and-cupcakes', 'new-baby']
  },
  {
    rank: 60,
    label: 'Birthday',
    slug: 'birthday',
    seoTitle: 'Birthday Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send birthday gifts in Uganda, including cakes, cupcakes, flowers, hampers and thoughtful surprises for every age and celebration.',
    h1: 'Birthday Gifts in Uganda',
    intro: 'Make birthdays easier to celebrate with gifts that can be ordered online in Uganda. Browse cakes, cupcakes, flowers, hampers and thoughtful birthday surprises.',
    relatedCategories: ['cakes-and-cupcakes', 'flowers', 'gift-baskets-and-food']
  },
  {
    rank: 70,
    label: 'Thank You',
    slug: 'thank-you',
    seoTitle: 'Thank You Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send thank you gifts in Uganda, including cakes, flowers, hampers, cupcakes, and thoughtful appreciation gifts.',
    h1: 'Thank You Gifts in Uganda',
    intro: 'Show your appreciation with thank you gifts delivered across Uganda. Choose cakes, flowers, hampers and thoughtful treats to thank friends, family, colleagues and mentors.',
    relatedCategories: ['flowers', 'gift-baskets-and-food', 'congratulations']
  },
  {
    rank: 80,
    label: 'Gift Baskets and Food',
    slug: 'gift-baskets-and-food',
    seoTitle: 'Gift Baskets and Food in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send gift baskets and food gifts in Uganda, including hampers, treats, cakes, cupcakes, and thoughtful food gifts.',
    h1: 'Gift Baskets and Food Gifts in Uganda',
    intro: 'Send gift baskets and food gifts packed with treats for delivery in Uganda. Browse hampers, snacks, cakes and cupcakes for birthdays, holidays and every celebration in between.',
    relatedCategories: ['thank-you', 'christmas', 'birthday']
  },
  {
    rank: 90,
    label: 'Flowers',
    slug: 'flowers',
    seoTitle: 'Flower Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send flower gifts in Uganda, including bouquets, cakes, hampers, cupcakes, and thoughtful gifts for special occasions.',
    h1: 'Flower Delivery in Uganda',
    intro: "Send fresh flowers in Uganda for romance, celebration and support. Browse bouquets and floral gifts for birthdays, anniversaries, Valentine's Day and heartfelt everyday moments.",
    relatedCategories: ['valentines-day', 'anniversary', 'birthday']
  },
  {
    rank: 100,
    label: 'Anniversary',
    slug: 'anniversary',
    seoTitle: 'Anniversary Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send anniversary gifts in Uganda, including flowers, cakes, cupcakes, hampers, and romantic thoughtful gifts.',
    h1: 'Anniversary Gifts in Uganda',
    intro: 'Celebrate another year of love with anniversary gifts delivered in Uganda. Shop romantic flowers, cakes, hampers and thoughtful surprises for husbands, wives and couples.',
    relatedCategories: ['flowers', 'valentines-day', 'cakes-and-cupcakes']
  },
  {
    rank: 110,
    label: 'Christmas',
    slug: 'christmas',
    seoTitle: 'Christmas Gifts in Uganda | Sendagift UG',
    seoDescription: 'Sendagift UG helps you send Christmas gifts in Uganda, including cakes, flowers, cupcakes, hampers, and thoughtful festive gifts.',
    h1: 'Christmas Gifts in Uganda',
    intro: 'Spread festive cheer with Christmas gifts delivered in Uganda. Browse hampers, cakes, flowers and thoughtful presents for family, friends and colleagues this holiday season.',
    relatedCategories: ['gift-baskets-and-food', 'cakes-and-cupcakes', 'thank-you']
  }
];


export const defaultCategoryOrder = [
  'Birthday',
  'Cakes and Cupcakes',
  'Flowers',
  'Anniversary',
  'Gift Baskets and Food',
  'Thank You',
  'Congratulations',
  'Baby Shower',
  'New Baby',
  "Valentine's Day",
  'Christmas'
] as const;

export const seasonalCategoryOrderMatrix = [
  { start_dd_mm: '01-01', end_dd_mm: '15-01', event: 'New Year / general gifting', order: ['Congratulations', 'Thank You', 'Gift Baskets and Food', 'Flowers', 'Cakes and Cupcakes', 'Birthday', 'Anniversary', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '16-01', end_dd_mm: '15-02', event: "Valentine's build-up and peak", order: ["Valentine's Day", 'Flowers', 'Cakes and Cupcakes', 'Gift Baskets and Food', 'Anniversary', 'Birthday', 'Thank You', 'Congratulations', 'Baby Shower', 'New Baby', 'Christmas'] },
  { start_dd_mm: '16-02', end_dd_mm: '31-03', event: 'Normal default season', order: ['Birthday', 'Cakes and Cupcakes', 'Flowers', 'Anniversary', 'Gift Baskets and Food', 'Thank You', 'Congratulations', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '01-04', end_dd_mm: '30-04', event: 'Easter / family gifting', order: ['Gift Baskets and Food', 'Cakes and Cupcakes', 'Flowers', 'Thank You', 'Congratulations', 'Birthday', 'Anniversary', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '01-05', end_dd_mm: '15-05', event: "Mother's Day-style gifting", order: ['Flowers', 'Thank You', 'Gift Baskets and Food', 'Cakes and Cupcakes', 'Birthday', 'Anniversary', 'Congratulations', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '16-05', end_dd_mm: '30-06', event: 'Appreciation / graduation-style gifting', order: ['Congratulations', 'Thank You', 'Flowers', 'Gift Baskets and Food', 'Cakes and Cupcakes', 'Birthday', 'Anniversary', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '01-07', end_dd_mm: '31-08', event: 'Normal default season', order: ['Birthday', 'Cakes and Cupcakes', 'Flowers', 'Anniversary', 'Gift Baskets and Food', 'Thank You', 'Congratulations', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '01-09', end_dd_mm: '30-09', event: 'Graduation / achievement gifting', order: ['Congratulations', 'Cakes and Cupcakes', 'Flowers', 'Gift Baskets and Food', 'Thank You', 'Birthday', 'Anniversary', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '01-10', end_dd_mm: '31-10', event: 'Normal default season', order: ['Birthday', 'Cakes and Cupcakes', 'Flowers', 'Anniversary', 'Gift Baskets and Food', 'Thank You', 'Congratulations', 'Baby Shower', 'New Baby', "Valentine's Day", 'Christmas'] },
  { start_dd_mm: '01-11', end_dd_mm: '15-11', event: 'Christmas early build-up', order: ['Christmas', 'Gift Baskets and Food', 'Cakes and Cupcakes', 'Flowers', 'Thank You', 'Birthday', 'Congratulations', 'Anniversary', 'Baby Shower', 'New Baby', "Valentine's Day"] },
  { start_dd_mm: '16-11', end_dd_mm: '26-12', event: 'Christmas peak', order: ['Christmas', 'Gift Baskets and Food', 'Cakes and Cupcakes', 'Flowers', 'Thank You', 'Congratulations', 'Birthday', 'Anniversary', 'Baby Shower', 'New Baby', "Valentine's Day"] },
  { start_dd_mm: '27-12', end_dd_mm: '31-12', event: 'End-of-year appreciation', order: ['Thank You', 'Congratulations', 'Gift Baskets and Food', 'Cakes and Cupcakes', 'Flowers', 'Birthday', 'Anniversary', 'Christmas', 'Baby Shower', 'New Baby', "Valentine's Day"] }
] as const;

export function ddMmToNumber(ddMm: string): number {
  const [day, month] = ddMm.split('-').map(Number);
  return month * 100 + day;
}

export function getTodayDdMm(date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}`;
}

export function getActiveSeasonalCategoryOrder(date = new Date()) {
  const today = ddMmToNumber(getTodayDdMm(date));

  return seasonalCategoryOrderMatrix.find((season) => {
    const start = ddMmToNumber(season.start_dd_mm);
    const end = ddMmToNumber(season.end_dd_mm);

    return today >= start && today <= end;
  });
}

function orderIndexByLabel(order: readonly string[]) {
  return new Map(order.map((label, index) => [label, index]));
}

export function normalizeCategorySlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getSortedGiftCategories(date = new Date()) {
  const activeSeason = getActiveSeasonalCategoryOrder(date);
  const seasonalOrderIndex = activeSeason ? orderIndexByLabel(activeSeason.order) : null;
  const defaultOrderIndex = orderIndexByLabel(defaultCategoryOrder);

  return [...giftCategories].sort((a, b) => {
    const aSeasonalIndex = seasonalOrderIndex?.get(a.label);
    const bSeasonalIndex = seasonalOrderIndex?.get(b.label);

    if (aSeasonalIndex !== undefined || bSeasonalIndex !== undefined) {
      return (aSeasonalIndex ?? Number.MAX_SAFE_INTEGER) - (bSeasonalIndex ?? Number.MAX_SAFE_INTEGER);
    }

    const aDefaultIndex = defaultOrderIndex.get(a.label);
    const bDefaultIndex = defaultOrderIndex.get(b.label);

    if (aDefaultIndex !== undefined || bDefaultIndex !== undefined) {
      return (aDefaultIndex ?? Number.MAX_SAFE_INTEGER) - (bDefaultIndex ?? Number.MAX_SAFE_INTEGER);
    }

    return a.rank - b.rank;
  });
}

export function getGiftCategoryBySlug(slug: string) {
  const normalizedSlug = normalizeCategorySlug(slug);
  return giftCategories.find((category) => normalizeCategorySlug(category.slug) === normalizedSlug) || null;
}

export function categoryPath(category: Pick<GiftCategory, 'slug'>) {
  return `/shop/category/${category.slug}`;
}
