import assert from 'node:assert/strict';
import test from 'node:test';
import { enrichHoldingFromImportedData } from '../src/api/enrich';
import type { EnrichedHolding } from '../src/types';

test('enrichHoldingFromImportedData resolves holdings with snapshot prices', () => {
  const holding: EnrichedHolding = {
    date: '2026-05-12',
    ticker: 'PSE:RLC',
    companyName: 'Robinsons Land Corporation',
    shares: 27_018_300,
    currency: 'PHP',
    yahooTicker: 'RLC.PS',
    resolved: false,
    failed: false,
    importedPrice: 17.88,
    importedSector: 'Real Estate',
  };

  assert.deepEqual(enrichHoldingFromImportedData(holding), {
    resolved: true,
    failed: false,
    currentPrice: 17.88,
    sector: 'Real Estate',
    industry: undefined,
    quoteCurrency: 'PHP',
  });
});

test('enrichHoldingFromImportedData leaves holdings without snapshot prices unresolved', () => {
  const holding: EnrichedHolding = {
    date: '2026-05-12',
    ticker: 'UNKNOWN:ABC',
    companyName: 'Unknown Holding',
    shares: 1,
    currency: 'USD',
    yahooTicker: 'ABC',
    resolved: false,
    failed: false,
  };

  assert.equal(enrichHoldingFromImportedData(holding), null);
});
