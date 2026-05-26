import type { EnrichedHolding } from '../types';

export interface QuoteResponse {
  currentPrice: number | null;
  previousClose: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;
  marketCap: number | null;
  peRatio: number | null;
  dividendYield: number | null;
  eps: number | null;
  sector: string | null;
  industry: string | null;
  quoteCurrency: string | null;
  error?: string;
}

function rawVal(obj: any): number | null {
  if (!obj) return null;
  if (typeof obj === 'number') return obj;
  if (obj.raw !== undefined) return obj.raw;
  return null;
}

export async function fetchQuote(yahooTicker: string): Promise<QuoteResponse> {
  try {
    const res = await fetch(`/api/quote?ticker=${encodeURIComponent(yahooTicker)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const chartResult = data?.chart?.chart?.result?.[0] ?? data?.chart?.result?.[0];
    const summaryResult = data?.summary?.quoteSummary?.result?.[0];

    const meta = chartResult?.meta;
    const currentPrice = meta?.regularMarketPrice ?? null;
    const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? null;
    const quoteCurrency = meta?.currency ?? null;

    const dayChange = currentPrice && previousClose ? currentPrice - previousClose : null;
    const dayChangePercent = previousClose && dayChange !== null ? (dayChange / previousClose) * 100 : null;

    const summaryDetail = summaryResult?.summaryDetail;
    const financialData = summaryResult?.financialData;
    const defaultKeyStatistics = summaryResult?.defaultKeyStatistics;
    const summaryProfile = summaryResult?.summaryProfile;

    return {
      currentPrice,
      previousClose,
      dayChange,
      dayChangePercent,
      marketCap: rawVal(summaryDetail?.marketCap),
      peRatio: rawVal(defaultKeyStatistics?.trailingPE) ?? rawVal(summaryDetail?.trailingPE),
      dividendYield: rawVal(summaryDetail?.dividendYield) ?? rawVal(financialData?.dividendYield),
      eps: rawVal(defaultKeyStatistics?.trailingEps),
      sector: summaryProfile?.sector ?? null,
      industry: summaryProfile?.industry ?? null,
      quoteCurrency,
    };
  } catch (err: any) {
    return {
      currentPrice: null,
      previousClose: null,
      dayChange: null,
      dayChangePercent: null,
      marketCap: null,
      peRatio: null,
      dividendYield: null,
      eps: null,
      sector: null,
      industry: null,
      quoteCurrency: null,
      error: err.message || 'Unknown error',
    };
  }
}

export async function enrichHolding(holding: EnrichedHolding): Promise<Partial<EnrichedHolding>> {
  const quote = await fetchQuote(holding.yahooTicker);

  if (quote.error) {
    return { resolved: true, failed: true };
  }

  return {
    resolved: true,
    failed: false,
    currentPrice: quote.currentPrice ?? undefined,
    previousClose: quote.previousClose ?? undefined,
    dayChange: quote.dayChange ?? undefined,
    dayChangePercent: quote.dayChangePercent ?? undefined,
    marketCap: quote.marketCap ?? undefined,
    peRatio: quote.peRatio ?? undefined,
    dividendYield: quote.dividendYield ?? undefined,
    eps: quote.eps ?? undefined,
    sector: quote.sector ?? undefined,
    industry: quote.industry ?? undefined,
    quoteCurrency: quote.quoteCurrency ?? undefined,
  };
}
