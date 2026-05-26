import type { FxRates } from '../types';

export async function fetchFxRates(currencies: string[], baseCurrency: string): Promise<FxRates> {
  const uniqueCurrencies = [...new Set(currencies.filter((c) => c && c !== baseCurrency))];
  if (uniqueCurrencies.length === 0) return {};

  // Build Yahoo FX tickers: {FROM}{TO}=X
  const pairs = uniqueCurrencies.map((c) => `${c}${baseCurrency}=X`);
  const pairsStr = pairs.join(',');

  try {
    const res = await fetch(`/api/fx?pairs=${encodeURIComponent(pairsStr)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.rates ?? {};
  } catch {
    // Return nulls for all pairs
    const rates: FxRates = {};
    pairs.forEach((p) => (rates[p] = null));
    return rates;
  }
}

export function convertToBaseCurrency(
  value: number,
  fromCurrency: string,
  baseCurrency: string,
  fxRates: FxRates
): number | null {
  if (fromCurrency === baseCurrency) return value;

  const pair = `${fromCurrency}${baseCurrency}=X`;
  const rate = fxRates[pair];

  if (rate === null || rate === undefined) return null;
  return value * rate;
}
