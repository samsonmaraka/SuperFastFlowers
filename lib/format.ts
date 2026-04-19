export const ugxNumberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

export function formatUgx(amount: number) {
  return ugxNumberFormatter.format(amount);
}
