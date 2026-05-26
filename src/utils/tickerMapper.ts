const EXCHANGE_SUFFIX_MAP: Record<string, string> = {
  // US
  NYSE: '',
  NasdaqGS: '',
  NasdaqGM: '',
  NasdaqCM: '',
  NASDAQ: '',
  AMEX: '',
  OTC: '',
  // UK
  LSE: '.L',
  LON: '.L',
  // Canada
  TSX: '.TO',
  TSXV: '.V',
  CSE: '.CN',
  // Australia
  ASX: '.AX',
  // Hong Kong
  HKSE: '.HK',
  HKG: '.HK',
  // India
  NSE: '.NS',
  BSE: '.BO',
  // Vietnam
  HOSE: '.VN',
  HNX: '.VN',
  // Thailand
  SET: '.BK',
  BKK: '.BK',
  // China
  SZSE: '.SZ',
  SSE: '.SS',
  // Japan
  TSE: '.T',
  JPX: '.T',
  // Germany
  FRA: '.F',
  ETR: '.DE',
  XETRA: '.DE',
  // France
  EPA: '.PA',
  // Italy
  MIL: '.MI',
  // Netherlands
  AMS: '.AS',
  // Switzerland
  SWX: '.SW',
  // Korea
  KRX: '.KS',
  KOSDAQ: '.KQ',
  // Singapore
  SES: '.SI',
  // Brazil
  BVMF: '.SA',
  // Mexico
  BMV: '.MX',
  // South Africa
  JSE: '.JO',
};

export function mapTickerToYahoo(ticker: string): { yahooTicker: string; exchange: string } {
  const colonIndex = ticker.indexOf(':');
  if (colonIndex === -1) {
    return { yahooTicker: ticker.trim().toUpperCase(), exchange: 'UNKNOWN' };
  }

  const exchange = ticker.substring(0, colonIndex).trim();
  const symbol = ticker.substring(colonIndex + 1).trim();

  const suffix = EXCHANGE_SUFFIX_MAP[exchange];
  if (suffix !== undefined) {
    return { yahooTicker: `${symbol}${suffix}`, exchange };
  }

  // Unknown exchange — return symbol as-is
  return { yahooTicker: symbol, exchange };
}

export function getExchangePrefix(ticker: string): string {
  const colonIndex = ticker.indexOf(':');
  return colonIndex === -1 ? '' : ticker.substring(0, colonIndex).trim();
}

export async function searchYahooTicker(query: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const quotes = data?.quotes ?? data?.finance?.result ?? [];
    if (quotes.length > 0) {
      return quotes[0].symbol ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
