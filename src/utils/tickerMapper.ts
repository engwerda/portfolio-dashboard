const EXCHANGE_SUFFIX_MAP: Record<string, string> = {
  // US
  NYSE: '',
  NASDAQ: '',
  NASDAQGS: '',
  NASDAQGM: '',
  NASDAQCM: '',
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
  SEHK: '.HK',
  HKSE: '.HK',
  HKG: '.HK',
  // India
  NSE: '.NS',
  NSEI: '.NS',
  BSE: '.BO',
  // Vietnam
  HOSE: '.VN',
  HNX: '.VN',
  'UNQ-VNM': '.VN',
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
  KOSE: '.KS',
  KOSDAQ: '.KQ',
  // Singapore
  SES: '.SI',
  SGX: '.SI',
  // Indonesia
  IDX: '.JK',
  // Philippines
  PSE: '.PS',
  // Brazil
  BVMF: '.SA',
  // Mexico
  BMV: '.MX',
  // South Africa
  JSE: '.JO',
};

function normalizeYahooSymbol(exchange: string, symbol: string): string {
  const exchangeKey = exchange.trim().toUpperCase();
  let normalized = symbol.trim().toUpperCase();

  // S&P/CIQ Korean tickers are often prefixed with A (e.g. KOSE:A003230),
  // while Yahoo expects the six-digit numeric symbol.
  if ((exchangeKey === 'KOSE' || exchangeKey === 'KOSDAQ' || exchangeKey === 'KRX') && /^A\d{6}$/.test(normalized)) {
    normalized = normalized.slice(1);
  }

  // Yahoo pads Hong Kong numeric tickers to four digits: 992 -> 0992.HK.
  if ((exchangeKey === 'SEHK' || exchangeKey === 'HKSE' || exchangeKey === 'HKG') && /^\d{1,3}$/.test(normalized)) {
    normalized = normalized.padStart(4, '0');
  }

  return normalized;
}

export function mapTickerToYahoo(ticker: string): { yahooTicker: string; exchange: string } {
  const colonIndex = ticker.indexOf(':');
  if (colonIndex === -1) {
    return { yahooTicker: ticker.trim().toUpperCase(), exchange: 'UNKNOWN' };
  }

  const exchange = ticker.substring(0, colonIndex).trim();
  const exchangeKey = exchange.toUpperCase();
  const symbol = ticker.substring(colonIndex + 1).trim();

  const suffix = EXCHANGE_SUFFIX_MAP[exchangeKey];
  const yahooSymbol = normalizeYahooSymbol(exchangeKey, symbol);
  if (suffix !== undefined) {
    return { yahooTicker: `${yahooSymbol}${suffix}`, exchange };
  }

  // Unknown exchange — return symbol as-is
  return { yahooTicker: yahooSymbol, exchange };
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
