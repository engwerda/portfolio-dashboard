import { useState, useEffect, useCallback, useMemo } from 'react';
import type { EnrichedHolding, FxRates, BaseCurrency, ParseWarning, RawHolding } from '../types';
import { mapTickerToYahoo, searchYahooTicker } from '../utils/tickerMapper';
import { enrichHolding, enrichHoldingFromImportedData } from '../api/enrich';
import { fetchFxRates, convertToBaseCurrency } from '../api/fx';
import { TotalValueCard } from './TotalValueCard';
import { HoldingsTable } from './HoldingsTable';
import { SectorChart } from './SectorChart';
import { CurrencyChart } from './CurrencyChart';
import { HoldingsChart } from './HoldingsChart';
import { CurrencySelector } from './CurrencySelector';
import { WarningBanner } from './WarningBanner';

const CONCURRENCY = 5;

interface Props {
  holdings: RawHolding[];
  warnings: ParseWarning[];
  onReset: () => void;
}

export function Dashboard({ holdings: rawHoldings, warnings, onReset }: Props) {
  const [holdings, setHoldings] = useState<EnrichedHolding[]>([]);
  const [fxRates, setFxRates] = useState<FxRates>({});
  const [baseCurrency, setBaseCurrency] = useState<BaseCurrency>('USD');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichmentDone, setEnrichmentDone] = useState(false);

  // Initialize holdings from raw data
  useEffect(() => {
    const initial: EnrichedHolding[] = rawHoldings.map((h) => {
      const { yahooTicker } = mapTickerToYahoo(h.ticker);
      return {
        ...h,
        yahooTicker,
        resolved: false,
        failed: false,
      };
    });
    setHoldings(initial);
  }, [rawHoldings]);

  // Compute market values as derived state — avoids stale useEffect dependency issues
  const enrichedHoldings = useMemo(() =>
    holdings.map((h) => {
      if (!h.resolved || h.failed || h.currentPrice === undefined) return h;
      const valueInQuoteCurrency = h.shares * h.currentPrice;
      const valueInBase = convertToBaseCurrency(
        valueInQuoteCurrency,
        h.quoteCurrency || h.currency,
        baseCurrency,
        fxRates
      );
      return { ...h, marketValueBase: valueInBase ?? undefined };
    }),
    [holdings, fxRates, baseCurrency]
  );

  // Enrich holdings progressively
  useEffect(() => {
    if (holdings.length === 0 || isEnriching || enrichmentDone) return;

    const unresolved = holdings.filter((h) => !h.resolved);
    if (unresolved.length === 0) return;

    setIsEnriching(true);

    const queue = [...unresolved];
    let running = 0;
    let index = 0;

    const processNext = () => {
      while (running < CONCURRENCY && index < queue.length) {
        const holding = queue[index++];
        running++;

        (async () => {
          let yahooTicker = holding.yahooTicker;

          // Try to enrich; if it fails, attempt search fallback
          let result = await enrichHolding(holding);

          if (result.failed) {
            // Some source exports use exchange-local identifiers that Yahoo
            // cannot quote directly (for example BSE numeric security codes).
            const searched = await searchYahooTicker(holding.companyName || holding.ticker, {
              sourceTicker: holding.ticker,
            });
            if (searched && searched !== holding.yahooTicker) {
              yahooTicker = searched;
              const retry = await enrichHolding({ ...holding, yahooTicker: searched });
              if (!retry.failed) {
                result = { ...retry, yahooTicker: searched };
              }
            }
          }

          if (result.failed) {
            // If Yahoo has no live quote for the local exchange, keep the
            // imported snapshot price instead of treating the holding as
            // unresolved. This is common for some frontier/local exchanges.
            const importedFallback = enrichHoldingFromImportedData(holding);
            if (importedFallback) {
              result = importedFallback;
            }
          }

          setHoldings((prev) =>
            prev.map((h) =>
              h.ticker === holding.ticker
                ? { ...h, ...result, yahooTicker }
                : h
            )
          );

          running--;
          processNext();

          // Check if all done
          if (index >= queue.length && running === 0) {
            setIsEnriching(false);
            setEnrichmentDone(true);
          }
        })();
      }
    };

    processNext();
  }, [holdings, isEnriching, enrichmentDone]);

  // Fetch FX rates after all resolved
  useEffect(() => {
    if (!enrichmentDone) return;

    const currencies = holdings
      .filter((h) => h.resolved && !h.failed)
      .map((h) => h.quoteCurrency || h.currency)
      .filter((c) => c && c !== baseCurrency);

    const unique = [...new Set(currencies)];
    if (unique.length > 0) {
      fetchFxRates(unique, baseCurrency).then(setFxRates);
    }
  }, [enrichmentDone, baseCurrency]);

  // Re-fetch FX rates when base currency changes
  const handleCurrencyChange = useCallback((newBase: BaseCurrency) => {
    setBaseCurrency(newBase);
    const currencies = holdings
      .filter((h) => h.resolved && !h.failed)
      .map((h) => h.quoteCurrency || h.currency)
      .filter((c) => c && c !== newBase);
    const unique = [...new Set(currencies)];
    if (unique.length > 0) {
      fetchFxRates(unique, newBase).then(setFxRates);
    } else {
      setFxRates({});
    }
  }, [holdings]);

  const resolvedCount = enrichedHoldings.filter((h) => h.resolved).length;
  const failedTickers = enrichedHoldings.filter((h) => h.failed);
  const totalValue = enrichedHoldings
    .filter((h) => h.marketValueBase !== undefined)
    .reduce((sum, h) => sum + (h.marketValueBase ?? 0), 0);

  const totalDayChange = enrichedHoldings
    .filter((h) => h.dayChange !== undefined && h.marketValueBase !== undefined)
    .reduce((sum, h) => {
      // dayChange is per share; scale by shares, then convert
      const changeInQuote = (h.dayChange ?? 0) * h.shares;
      const changeInBase = convertToBaseCurrency(
        changeInQuote,
        h.quoteCurrency || h.currency,
        baseCurrency,
        fxRates
      );
      return sum + (changeInBase ?? 0);
    }, 0);

  const totalPreviousValue = totalValue - totalDayChange;
  const totalDayChangePercent = totalPreviousValue !== 0 ? (totalDayChange / totalPreviousValue) * 100 : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {rawHoldings.length} holdings · {rawHoldings[0]?.date || 'Snapshot'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <CurrencySelector value={baseCurrency} onChange={handleCurrencyChange} />
          <button
            onClick={onReset}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Upload New
          </button>
        </div>
      </div>

      {/* Warnings */}
      {failedTickers.length > 0 && <WarningBanner failedTickers={failedTickers} />}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {warnings.length} CSV warning{warnings.length > 1 ? 's' : ''} during import
          </p>
        </div>
      )}

      {/* Total Value */}
      <TotalValueCard
        totalValue={totalValue || null}
        totalDayChange={totalDayChange || null}
        totalDayChangePercent={totalDayChangePercent}
        baseCurrency={baseCurrency}
        holdingCount={enrichedHoldings.length}
        resolvedCount={resolvedCount}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectorChart holdings={enrichedHoldings} />
        <CurrencyChart holdings={enrichedHoldings} />
      </div>

      {/* Holdings Chart */}
      <HoldingsChart holdings={enrichedHoldings} baseCurrency={baseCurrency} />

      {/* Holdings Table */}
      <HoldingsTable holdings={enrichedHoldings} baseCurrency={baseCurrency} />
    </div>
  );
}
