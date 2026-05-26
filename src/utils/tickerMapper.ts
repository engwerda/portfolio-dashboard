interface YahooSearchQuote {
  symbol?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
}

interface SearchYahooTickerOptions {
  sourceTicker?: string;
}

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

const SEARCH_EXCHANGE_HINTS: Record<string, { suffixes: string[]; exchanges: string[]; exchangeNames: string[] }> = {
  BSE: { suffixes: ['.BO'], exchanges: ['BSE'], exchangeNames: ['Bombay'] },
  NSE: { suffixes: ['.NS'], exchanges: ['NSI'], exchangeNames: ['NSE'] },
  NSEI: { suffixes: ['.NS'], exchanges: ['NSI'], exchangeNames: ['NSE'] },
  SEHK: { suffixes: ['.HK'], exchanges: ['HKG'], exchangeNames: ['Hong Kong'] },
  HKSE: { suffixes: ['.HK'], exchanges: ['HKG'], exchangeNames: ['Hong Kong'] },
  HKG: { suffixes: ['.HK'], exchanges: ['HKG'], exchangeNames: ['Hong Kong'] },
  HOSE: { suffixes: ['.VN'], exchanges: [], exchangeNames: ['Vietnam'] },
  HNX: { suffixes: ['.VN'], exchanges: [], exchangeNames: ['Vietnam'] },
  'UNQ-VNM': { suffixes: ['.VN'], exchanges: [], exchangeNames: ['Vietnam'] },
  KOSE: { suffixes: ['.KS'], exchanges: ['KSC'], exchangeNames: ['Korea'] },
  KOSDAQ: { suffixes: ['.KQ'], exchanges: ['KOE'], exchangeNames: ['KOSDAQ'] },
  IDX: { suffixes: ['.JK'], exchanges: ['JKT'], exchangeNames: ['Jakarta'] },
  PSE: { suffixes: ['.PS'], exchanges: [], exchangeNames: ['Philippines'] },
  SET: { suffixes: ['.BK'], exchanges: ['SET'], exchangeNames: ['Thailand'] },
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

function isCompatibleQuote(quote: YahooSearchQuote, sourceExchange: string): boolean {
  const hints = SEARCH_EXCHANGE_HINTS[sourceExchange];
  if (!hints) return true;

  const symbol = quote.symbol?.toUpperCase() ?? '';
  const exchange = quote.exchange?.toUpperCase() ?? '';
  const exchangeName = quote.exchDisp?.toLowerCase() ?? '';

  return (
    hints.suffixes.some((suffix) => symbol.endsWith(suffix)) ||
    hints.exchanges.some((candidate) => exchange === candidate.toUpperCase()) ||
    hints.exchangeNames.some((candidate) => exchangeName.includes(candidate.toLowerCase()))
  );
}

function pickYahooSearchSymbol(quotes: YahooSearchQuote[], sourceTicker?: string): string | null {
  const equityQuotes = quotes.filter((quote) => !quote.quoteType || quote.quoteType === 'EQUITY');
  if (equityQuotes.length === 0) return null;

  const sourceExchange = sourceTicker ? getExchangePrefix(sourceTicker).toUpperCase() : '';
  const match = sourceExchange
    ? equityQuotes.find((quote) => isCompatibleQuote(quote, sourceExchange))
    : equityQuotes[0];

  return match?.symbol ?? null;
}

export async function searchYahooTicker(query: string, options: SearchYahooTickerOptions = {}): Promise<string | null> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    const quotes = data?.quotes ?? data?.finance?.result ?? [];
    return pickYahooSearchSymbol(quotes, options.sourceTicker);
  } catch {
    return null;
  }
}
