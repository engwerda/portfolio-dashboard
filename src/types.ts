export interface RawHolding {
  date: string;
  ticker: string;
  companyName: string;
  shares: number;
  currency: string;
  importedPrice?: number;
  importedSector?: string;
  importedIndustry?: string;
}

export interface EnrichedHolding extends RawHolding {
  yahooTicker: string;
  resolved: boolean;
  failed: boolean;
  currentPrice?: number;
  previousClose?: number;
  dayChange?: number;
  dayChangePercent?: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  eps?: number;
  sector?: string;
  industry?: string;
  quoteCurrency?: string;
  marketValueBase?: number;
}

export interface FxRates {
  [pair: string]: number | null;
}

export interface ParseWarning {
  type: 'fixed' | 'skipped';
  message: string;
  row?: number;
}

export type BaseCurrency = string;
