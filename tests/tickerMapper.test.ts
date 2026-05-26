import assert from 'node:assert/strict';
import test from 'node:test';
import { mapTickerToYahoo } from '../src/utils/tickerMapper';

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
