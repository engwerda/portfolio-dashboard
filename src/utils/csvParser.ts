import Papa from 'papaparse';
import type { RawHolding, ParseWarning } from '../types';
import { parseDate } from './dateParser';

interface ParseResult {
  holdings: RawHolding[];
  warnings: ParseWarning[];
  snapshotDate: Date | null;
}

interface ParseCsvOptions {
  fileName?: string;
}

type CsvRow = Record<string, string | undefined>;

type FieldName = 'date' | 'ticker' | 'companyName' | 'shares' | 'currency' | 'code' | 'country';

const FIELD_ALIASES: Record<FieldName, string[]> = {
  date: [
    'Date',
    'as_of_date',
    'as of date',
    'snapshot date',
    'portfolio date',
    'holding date',
    'uploaded_at',
  ],
  ticker: [
    'Ticker',
    'CIQ Ticker',
    'Symbol',
    'Security Ticker',
    'Instrument Ticker',
    'Yahoo Ticker',
    'Code',
  ],
  companyName: [
    'Company Name',
    'company_name',
    'Company',
    'Name',
    'Security Name',
    'Instrument Name',
    'Holding Name',
  ],
  shares: [
    'Shares',
    'No. shares',
    'No shares',
    'Number of shares',
    'Num shares',
    'Current shares',
    'Quantity',
    'Units',
    'Position',
    'Holding',
    'Holdings',
    'Last Num. Share Held',
  ],
  currency: [
    'Currency',
    'trading_currency',
    'Trading Currency',
    'Quote Currency',
    'Local Currency',
    'Price Currency',
    'Trade Currency',
  ],
  code: ['Code', 'Local Code', 'Bloomberg Code', 'RIC'],
  country: ['Country', 'country', 'Market Country', 'Domicile'],
};

const EXCHANGE_CURRENCY_MAP: Record<string, string> = {
  // United States
  NYSE: 'USD',
  NASDAQ: 'USD',
  NASDAQGS: 'USD',
  NASDAQGM: 'USD',
  NASDAQCM: 'USD',
  AMEX: 'USD',
  OTC: 'USD',
  // Hong Kong
  SEHK: 'HKD',
  HKSE: 'HKD',
  HKG: 'HKD',
  // Vietnam
  HOSE: 'VND',
  HNX: 'VND',
  'UNQ-VNM': 'VND',
  // India
  BSE: 'INR',
  NSE: 'INR',
  NSEI: 'INR',
  // South Korea
  KRX: 'KRW',
  KOSE: 'KRW',
  KOSDAQ: 'KRW',
  // Indonesia
  IDX: 'IDR',
  // Thailand
  SET: 'THB',
  BKK: 'THB',
  // Philippines
  PSE: 'PHP',
  // Other common exchanges
  LSE: 'GBP',
  LON: 'GBP',
  TSX: 'CAD',
  TSXV: 'CAD',
  ASX: 'AUD',
  TSE: 'JPY',
  JPX: 'JPY',
  SSE: 'CNY',
  SZSE: 'CNY',
  SGX: 'SGD',
  SES: 'SGD',
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'united states': 'USD',
  'united states of america': 'USD',
  usa: 'USD',
  'hong kong': 'HKD',
  vietnam: 'VND',
  'viet nam': 'VND',
  india: 'INR',
  'south korea': 'KRW',
  korea: 'KRW',
  indonesia: 'IDR',
  thailand: 'THB',
  philippines: 'PHP',
  japan: 'JPY',
  china: 'CNY',
  singapore: 'SGD',
  canada: 'CAD',
  australia: 'AUD',
  'united kingdom': 'GBP',
  uk: 'GBP',
};

const CODE_SUFFIX_CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  HK: 'HKD',
  VN: 'VND',
  IN: 'INR',
  KS: 'KRW',
  KQ: 'KRW',
  IJ: 'IDR',
  TB: 'THB',
  PM: 'PHP',
  JP: 'JPY',
  CH: 'CNY',
  SP: 'SGD',
  CN: 'CAD',
  AU: 'AUD',
  LN: 'GBP',
};

function cleanHeader(header: string): string {
  return header.replace(/^\uFEFF/, '').trim();
}

function normalizeHeader(header: string): string {
  return cleanHeader(header)
    .replace(/\([^)]*\)/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeCell(value: string | undefined): string {
  return (value ?? '').replace(/^\uFEFF/, '').trim();
}

function isBlankish(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === '-' || normalized === 'n/a' || normalized === 'na' || normalized === 'null';
}

function buildColumnLookup(row: CsvRow): Map<string, string[]> {
  const lookup = new Map<string, string[]>();

  for (const key of Object.keys(row)) {
    const normalized = normalizeHeader(key);
    const existing = lookup.get(normalized);
    if (existing) {
      existing.push(key);
    } else {
      lookup.set(normalized, [key]);
    }
  }

  return lookup;
}

function hasAnyField(row: CsvRow | undefined, aliases: string[]): boolean {
  if (!row) return false;
  const lookup = buildColumnLookup(row);
  return aliases.some((alias) => lookup.has(normalizeHeader(alias)));
}

function readFirstValue(row: CsvRow, aliases: string[]): string {
  const lookup = buildColumnLookup(row);

  for (const alias of aliases) {
    const keys = lookup.get(normalizeHeader(alias));
    if (!keys) continue;

    for (const key of keys) {
      const value = normalizeCell(row[key]);
      if (!isBlankish(value)) return value;
    }
  }

  return '';
}

function parseFlexibleNumber(raw: string): number | null {
  if (isBlankish(raw)) return null;

  const trimmed = raw.trim();
  const isNegativeAccounting = /^\(.*\)$/.test(trimmed);
  const numeric = trimmed
    .replace(/^\((.*)\)$/, '$1')
    .replace(/,/g, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9.+\-eE]/g, '');

  if (!numeric || numeric === '-' || numeric === '.') return null;

  const parsed = Number(numeric);
  if (Number.isNaN(parsed)) return null;

  return isNegativeAccounting ? -Math.abs(parsed) : parsed;
}

function normalizeTicker(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().toUpperCase();
}

function normalizeCurrency(raw: string): string | null {
  const currency = raw.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) return currency;

  const extracted = currency.match(/\b[A-Z]{3}\b/);
  return extracted?.[0] ?? null;
}

function inferCurrency(ticker: string, code: string, country: string): string | null {
  const exchange = ticker.includes(':') ? ticker.split(':', 1)[0].toUpperCase() : '';
  if (exchange && EXCHANGE_CURRENCY_MAP[exchange]) return EXCHANGE_CURRENCY_MAP[exchange];

  const normalizedCountry = country.trim().toLowerCase();
  if (normalizedCountry && COUNTRY_CURRENCY_MAP[normalizedCountry]) {
    return COUNTRY_CURRENCY_MAP[normalizedCountry];
  }

  const codeSuffix = code.trim().split(/\s+/).pop()?.toUpperCase() ?? '';
  if (codeSuffix && CODE_SUFFIX_CURRENCY_MAP[codeSuffix]) return CODE_SUFFIX_CURRENCY_MAP[codeSuffix];

  return null;
}

function isCashLikeHolding(ticker: string, companyName: string): boolean {
  const normalizedTicker = ticker.toUpperCase();
  const normalizedName = companyName.trim().toUpperCase();

  return (
    normalizedTicker === 'CASH' ||
    normalizedTicker.startsWith('CASH ') ||
    normalizedTicker.endsWith(':CASH') ||
    normalizedName === 'CASH' ||
    (normalizedName === '-' && normalizedTicker.includes('CASH'))
  );
}

function parseDateFromFileName(fileName?: string): Date | null {
  if (!fileName) return null;

  let match = fileName.match(/(?:^|[^0-9])(\d{4})[-_](\d{1,2})[-_](\d{1,2})(?![0-9])/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  match = fileName.match(/(?:^|[^0-9])(\d{1,2})[-_](\d{1,2})[-_](\d{4})(?![0-9])/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));

  return null;
}

function formatDateForHolding(date: Date | null): string {
  if (!date) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseCsv(csvText: string, options: ParseCsvOptions = {}): ParseResult {
  const warnings: ParseWarning[] = [];
  const result = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: cleanHeader,
  });

  for (const error of result.errors) {
    warnings.push({ type: 'fixed', message: `CSV parse warning: ${error.message}` });
  }

  const firstRow = result.data.find((row) => Object.keys(row).some((key) => !isBlankish(normalizeCell(row[key]))));
  if (!firstRow) return { holdings: [], warnings, snapshotDate: parseDateFromFileName(options.fileName) };

  if (!hasAnyField(firstRow, FIELD_ALIASES.ticker)) {
    warnings.push({
      type: 'skipped',
      message: `Missing ticker column. Supported aliases include: ${FIELD_ALIASES.ticker.slice(0, 4).join(', ')}`,
    });
    return { holdings: [], warnings, snapshotDate: parseDateFromFileName(options.fileName) };
  }

  if (!hasAnyField(firstRow, FIELD_ALIASES.shares)) {
    warnings.push({
      type: 'skipped',
      message: `Missing shares column. Supported aliases include: ${FIELD_ALIASES.shares.slice(0, 4).join(', ')}`,
    });
    return { holdings: [], warnings, snapshotDate: parseDateFromFileName(options.fileName) };
  }

  let snapshotDate: Date | null = parseDateFromFileName(options.fileName);
  const holdings: RawHolding[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const csvRowNumber = i + 2;

    const dateRaw = readFirstValue(row, FIELD_ALIASES.date);
    const tickerRaw = readFirstValue(row, FIELD_ALIASES.ticker);
    const companyName = readFirstValue(row, FIELD_ALIASES.companyName);
    const sharesRaw = readFirstValue(row, FIELD_ALIASES.shares);
    const currencyRaw = readFirstValue(row, FIELD_ALIASES.currency);
    const code = readFirstValue(row, FIELD_ALIASES.code);
    const country = readFirstValue(row, FIELD_ALIASES.country);

    const ticker = normalizeTicker(tickerRaw);

    if (!ticker) {
      warnings.push({ type: 'skipped', message: `Row ${csvRowNumber}: Missing ticker`, row: csvRowNumber });
      continue;
    }

    if (isCashLikeHolding(ticker, companyName)) {
      warnings.push({ type: 'skipped', message: `Row ${csvRowNumber}: Skipped cash/non-equity row`, row: csvRowNumber });
      continue;
    }

    const shares = parseFlexibleNumber(sharesRaw);
    if (shares === null) {
      warnings.push({ type: 'skipped', message: `Row ${csvRowNumber}: Invalid shares "${sharesRaw}" for ${ticker}`, row: csvRowNumber });
      continue;
    }

    const directCurrency = currencyRaw ? normalizeCurrency(currencyRaw) : null;
    const fixedCurrency = directCurrency ?? inferCurrency(ticker, code, country) ?? 'USD';
    if (!directCurrency && fixedCurrency === 'USD' && !inferCurrency(ticker, code, country)) {
      warnings.push({ type: 'fixed', message: `Row ${csvRowNumber}: Defaulted ${ticker} currency to USD` });
    }

    const rowDate = dateRaw || formatDateForHolding(snapshotDate);
    if (dateRaw) {
      const parsedRowDate = parseDate(dateRaw);
      if (!snapshotDate && parsedRowDate) snapshotDate = parsedRowDate;
    }

    holdings.push({
      date: rowDate,
      ticker,
      companyName,
      shares,
      currency: fixedCurrency,
    });
  }

  return { holdings, warnings, snapshotDate };
}
