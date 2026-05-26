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

export async function fetchQuote(yahooTicker: string, companyName?: string): Promise<QuoteResponse> {
  try {
    const res = await fetch(`/api/quote?ticker=${encodeURIComponent(yahooTicker)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Extract price data from chart API
    const chartResult = data?.chart?.chart?.result?.[0] ?? data?.chart?.result?.[0];
    const meta = chartResult?.meta;
    const currentPrice = meta?.regularMarketPrice ?? null;
    const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? null;
    const quoteCurrency = meta?.currency ?? null;

    const dayChange = currentPrice && previousClose ? currentPrice - previousClose : null;
    const dayChangePercent = previousClose && dayChange !== null ? (dayChange / previousClose) * 100 : null;

    // Extract sector/industry from search API response
    const searchQuotes = data?.search?.quotes ?? [];
    const searchMatch = searchQuotes.find(
      (q: any) => q.symbol === yahooTicker || q.sector
    ) ?? searchQuotes[0];
    const sector = searchMatch?.sector ?? null;
    const industry = searchMatch?.industry ?? null;

    // Try to extract fundamentals from summary if available (crumb-auth)
    const summaryResult = data?.summary?.finance?.result?.[0] ?? data?.summary?.quoteSummary?.result?.[0];
    const summaryDetail = summaryResult?.summaryDetail;
    const financialData = summaryResult?.financialData;
    const defaultKeyStatistics = summaryResult?.defaultKeyStatistics;

    return {
      currentPrice,
      previousClose,
      dayChange,
      dayChangePercent,
      marketCap: rawVal(summaryDetail?.marketCap),
      peRatio: rawVal(defaultKeyStatistics?.trailingPE) ?? rawVal(summaryDetail?.trailingPE),
      dividendYield: rawVal(summaryDetail?.dividendYield) ?? rawVal(financialData?.dividendYield),
      eps: rawVal(defaultKeyStatistics?.trailingEps),
      sector,
      industry,
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
  const quote = await fetchQuote(holding.yahooTicker, holding.companyName);

  if (quote.error && !quote.currentPrice) {
    return { resolved: true, failed: true };
  }

  return {
    resolved: true,
    failed: !quote.currentPrice,
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
