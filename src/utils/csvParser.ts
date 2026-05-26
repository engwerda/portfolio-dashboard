import Papa from 'papaparse';
import type { RawHolding, ParseWarning } from '../types';
import { parseDate } from './dateParser';

interface ParseResult {
  holdings: RawHolding[];
  warnings: ParseWarning[];
  snapshotDate: Date | null;
}

export function parseCsv(csvText: string): ParseResult {
  const warnings: ParseWarning[] = [];
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  let snapshotDate: Date | null = null;
  const holdings: RawHolding[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];

    // Fix-up: trim and normalize
    const date = (row['Date'] ?? '').trim();
    const ticker = (row['Ticker'] ?? '').trim().toUpperCase();
    const companyName = (row['Company Name'] ?? '').trim();
    const sharesRaw = (row['Shares'] ?? '').trim();
    const currency = (row['Currency'] ?? '').trim().toUpperCase();

    // Skip rows missing critical fields
    if (!ticker) {
      warnings.push({ type: 'skipped', message: `Row ${i + 2}: Missing ticker`, row: i + 2 });
      continue;
    }

    if (!sharesRaw || isNaN(Number(sharesRaw))) {
      warnings.push({ type: 'skipped', message: `Row ${i + 2}: Invalid shares "${sharesRaw}" for ${ticker}`, row: i + 2 });
      continue;
    }

    // Fix-up: default currency
    const fixedCurrency = currency || 'USD';
    if (!currency) {
      warnings.push({ type: 'fixed', message: `Row ${i + 2}: Defaulted ${ticker} currency to USD` });
    }

    const shares = Number(sharesRaw);

    // Try to parse date for snapshot
    if (!snapshotDate && date) {
      snapshotDate = parseDate(date);
    }

    holdings.push({
      date,
      ticker,
      companyName,
      shares,
      currency: fixedCurrency,
    });
  }

  return { holdings, warnings, snapshotDate };
}
