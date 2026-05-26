import assert from 'node:assert/strict';
import test from 'node:test';
import { mapTickerToYahoo, searchYahooTicker } from '../src/utils/tickerMapper';

test('maps CIQ-style exchange tickers from NTAsset exports to Yahoo symbols', () => {
  assert.equal(mapTickerToYahoo('SEHK:1299').yahooTicker, '1299.HK');
  assert.equal(mapTickerToYahoo('SEHK:992').yahooTicker, '0992.HK');
  assert.equal(mapTickerToYahoo('KOSE:A003230').yahooTicker, '003230.KS');
  assert.equal(mapTickerToYahoo('KOSDAQ:A241710').yahooTicker, '241710.KQ');
  assert.equal(mapTickerToYahoo('IDX:BFIN').yahooTicker, 'BFIN.JK');
  assert.equal(mapTickerToYahoo('NSEI:HDFCBANK').yahooTicker, 'HDFCBANK.NS');
  assert.equal(mapTickerToYahoo('PSE:RLC').yahooTicker, 'RLC.PS');
  assert.equal(mapTickerToYahoo('UNQ-VNM:ACV').yahooTicker, 'ACV.VN');
});

test('searchYahooTicker prefers symbols compatible with the source exchange', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    quotes: [
      { symbol: 'AXISBANK.NS', quoteType: 'EQUITY', exchange: 'NSI', exchDisp: 'NSE' },
      { symbol: 'AXISBANK.BO', quoteType: 'EQUITY', exchange: 'BSE', exchDisp: 'Bombay' },
    ],
  }))) as typeof fetch;

  try {
    const symbol = await searchYahooTicker('Axis Bank Limited', { sourceTicker: 'BSE:532215' });
    assert.equal(symbol, 'AXISBANK.BO');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('searchYahooTicker rejects incompatible OTC fallbacks for local exchange holdings', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    quotes: [
      { symbol: 'RBLAY', quoteType: 'EQUITY', exchange: 'PNK', exchDisp: 'OTC Markets' },
    ],
  }))) as typeof fetch;

  try {
    const symbol = await searchYahooTicker('Robinsons Land Corporation', { sourceTicker: 'PSE:RLC' });
    assert.equal(symbol, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
