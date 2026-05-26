import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCsv } from '../src/utils/csvParser';

test('parses the original Date/Ticker/Company Name/Shares/Currency CSV shape', () => {
  const csv = [
    'Date,Ticker,Company Name,Shares,Currency',
    '2026-03-26,NasdaqGS:MSFT,Microsoft Corporation,200,USD',
    '26/03/2026,SET:KBANK,Kasikornbank Public Company Limited,1,THB',
  ].join('\n');

  const result = parseCsv(csv);

  assert.equal(result.holdings.length, 2);
  assert.deepEqual(result.holdings[0], {
    date: '2026-03-26',
    ticker: 'NASDAQGS:MSFT',
    companyName: 'Microsoft Corporation',
    shares: 200,
    currency: 'USD',
  });
  assert.equal(result.holdings[1].currency, 'THB');
  assert.equal(result.warnings.length, 0);
});

test('parses snake_case portfolio snapshot exports', () => {
  const csv = [
    'as_of_date,ticker,company_name,exchange,country,sector,gics_subindustry,shares,trading_currency',
    '2026-05-24,BSE:500101,Arvind Limited,Mumbai Stock Exchange,India,Consumer Discretionary,Textiles,"3,350,000",INR',
  ].join('\n');

  const result = parseCsv(csv);

  assert.equal(result.holdings.length, 1);
  assert.deepEqual(result.holdings[0], {
    date: '2026-05-24',
    ticker: 'BSE:500101',
    companyName: 'Arvind Limited',
    shares: 3_350_000,
    currency: 'INR',
    importedSector: 'Consumer Discretionary',
    importedIndustry: 'Textiles',
  });
});

test('parses NTAsset allocation exports with CIQ ticker, inferred currency, filename date, and cash skipped', () => {
  const csv = [
    'Company Name,Code,CIQ Ticker,Country,Industry,Market cap (m USD),No. shares,Weekly Change,Last Num. Share Held(Weekly Change) ,% Weekly Change(Weekly Change),Close price,Value (m Local),Value (m USD),% of NAV(Ownership)',
    'AIA Group Limited,1299 HK,SEHK:1299,Hong Kong,Financials,115154.64,4700000.0,0.0,4700000.0,0.0,86.6,4070.2,51.99,8.49',
    '"Samyang Foods Co., Ltd.",003230 KS,KOSE:A003230,South Korea,Consumer Staples,6693.3,35000.0,2500.0,32500.0,7.692308,1319000.0,461650.0,31.39,5.12',
    '-,CASH USD,-,-,-,-,-,-,-,-,-,-,-,4.85',
  ].join('\n');

  const result = parseCsv(csv, {
    fileName: 'portfolio_snapshot_NTAsset_Allocation_2026_05_12-11_58_48 (2).csv',
  });

  assert.equal(result.holdings.length, 2);
  assert.deepEqual(result.holdings[0], {
    date: '2026-05-12',
    ticker: 'SEHK:1299',
    companyName: 'AIA Group Limited',
    shares: 4_700_000,
    currency: 'HKD',
    importedPrice: 86.6,
    importedSector: 'Financials',
  });
  assert.deepEqual(result.holdings[1], {
    date: '2026-05-12',
    ticker: 'KOSE:A003230',
    companyName: 'Samyang Foods Co., Ltd.',
    shares: 35_000,
    currency: 'KRW',
    importedPrice: 1_319_000,
    importedSector: 'Consumer Staples',
  });
  assert.equal(result.snapshotDate?.getFullYear(), 2026);
  assert.equal(result.snapshotDate?.getMonth(), 4);
  assert.equal(result.snapshotDate?.getDate(), 12);
  assert.equal(result.warnings.length, 0);
});
