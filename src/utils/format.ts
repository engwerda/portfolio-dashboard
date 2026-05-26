export function formatNumber(value: number, decimals: number = 0, currency?: string): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: currency ? 'currency' : 'decimal',
    currency: currency ?? undefined,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
  });
  return formatter.format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number | undefined, decimals: number = 2): string {
  if (value === undefined || value === null) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}
