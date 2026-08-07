export type FlavourId =
  | 'vanilla'
  | 'coconut'
  | 'strawberry'
  | 'lemon'
  | 'chocolate'
  | 'mocha'
  | 'red-velvet'
  | 'blueberry'
  | 'bubble-gum'
  | 'banana'
  | 'orange'
  | 'mint-chocolate';

export type FlavourStatus = 'active' | 'inactive';

export type Flavour = {
  id: FlavourId;
  label: string;
  rank: number;
  swatch: string;
  status: FlavourStatus;
};

// A closed, ordered list. Flavours are retired by setting status to 'inactive',
// never by deleting them, so historical orders can still resolve their label.
export const flavours: Flavour[] = [
  { id: 'vanilla', label: 'Vanilla', rank: 10, swatch: '#EFDFA8', status: 'active' },
  { id: 'coconut', label: 'Coconut', rank: 20, swatch: '#DCD6C8', status: 'active' },
  { id: 'strawberry', label: 'Strawberry', rank: 30, swatch: '#E8637C', status: 'active' },
  { id: 'lemon', label: 'Lemon', rank: 40, swatch: '#F2CE3C', status: 'active' },
  { id: 'chocolate', label: 'Chocolate', rank: 50, swatch: '#6B4226', status: 'active' },
  { id: 'mocha', label: 'Mocha', rank: 60, swatch: '#997155', status: 'active' },
  { id: 'red-velvet', label: 'Red Velvet', rank: 70, swatch: '#A62B39', status: 'active' },
  { id: 'blueberry', label: 'Blueberry', rank: 80, swatch: '#5A6BA8', status: 'active' },
  { id: 'bubble-gum', label: 'Bubble Gum', rank: 90, swatch: '#F49AC2', status: 'active' },
  { id: 'banana', label: 'Banana', rank: 100, swatch: '#E8C95E', status: 'active' },
  { id: 'orange', label: 'Orange', rank: 110, swatch: '#E2833A', status: 'active' },
  { id: 'mint-chocolate', label: 'Mint Chocolate', rank: 120, swatch: '#7FC0A0', status: 'active' }
];

export const FLAVOUR_IDS = flavours.map((flavour) => flavour.id);

const flavoursById = new Map<string, Flavour>(flavours.map((flavour) => [flavour.id, flavour]));

export function isFlavourId(value: unknown): value is FlavourId {
  return typeof value === 'string' && flavoursById.has(value);
}

export function getFlavour(id: string): Flavour | null {
  return flavoursById.get(id) || null;
}

export function getFlavourLabel(id: string): string {
  return flavoursById.get(id)?.label || id;
}

export function sortFlavours(values: Flavour[]) {
  return [...values].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
}

export function getActiveFlavours() {
  return sortFlavours(flavours.filter((flavour) => flavour.status === 'active'));
}

// Accepts ids, labels, and loose spellings ("Red Velvet", "MINT CHOCOLATE") so CSV
// imports and admin input do not have to know the exact slug.
export function normalizeFlavourId(value: string | undefined | null): FlavourId | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase().replace(/[\s_]+/g, '-');
  if (isFlavourId(normalized)) return normalized;

  const byLabel = flavours.find((flavour) => flavour.label.toLowerCase() === value.trim().toLowerCase());
  return byLabel ? byLabel.id : null;
}

export function normalizeFlavourIds(values: Array<string | undefined | null> | undefined | null): FlavourId[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<FlavourId>();
  for (const value of values) {
    const id = normalizeFlavourId(value);
    if (id) seen.add(id);
  }

  return FLAVOUR_IDS.filter((id) => seen.has(id));
}

// The flavours a customer may actually pick for this product: the product's own
// allow-list, minus anything retired, in registry order. Empty means the product
// has no flavour choice at all.
export function resolveProductFlavours(product: { flavours?: string[] | null } | null | undefined): Flavour[] {
  const allowed = normalizeFlavourIds(product?.flavours);
  if (!allowed.length) return [];

  return sortFlavours(
    allowed
      .map((id) => flavoursById.get(id))
      .filter((flavour): flavour is Flavour => Boolean(flavour) && flavour!.status === 'active')
  );
}

export function productRequiresFlavour(product: { flavours?: string[] | null } | null | undefined) {
  return resolveProductFlavours(product).length > 0;
}

// "Vanilla, Chocolate and Lemon" — readable prose for page copy and metadata,
// so the flavour names exist as sentences a search engine can read rather than
// only as labels inside the picker widget.
export function formatFlavourList(values: Array<Flavour | FlavourId>) {
  const labels = values.map((value) => (typeof value === 'string' ? getFlavourLabel(value) : value.label));
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];

  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

export function productFlavourSentence(product: { flavours?: string[] | null } | null | undefined) {
  const available = resolveProductFlavours(product);
  if (!available.length) return '';

  return `Available in ${available.length} flavour${available.length === 1 ? '' : 's'}: ${formatFlavourList(available)}.`;
}
