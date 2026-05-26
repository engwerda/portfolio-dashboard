import type { EnrichedHolding } from '../types';
import { formatNumber, formatPercent } from '../utils/format';

interface Props {
  holdings: EnrichedHolding[];
  baseCurrency: string;
}

export function HoldingsTable({ holdings, baseCurrency }: Props) {
  const sorted = [...holdings].sort((a, b) => {
    const aVal = a.marketValueBase ?? 0;
    const bVal = b.marketValueBase ?? 0;
    return bVal - aVal;
  });

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold">Holdings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50">
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Ticker</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Company</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400">Shares</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400">Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400">Market Value</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400">Day Change</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400">P/E</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-slate-400">Div Yield</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-slate-400">Sector</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {sorted.map((h) => (
              <tr key={h.ticker} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    {h.ticker}
                    {h.failed && <span className="badge-warning">⚠ N/A</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300 max-w-[200px] truncate">{h.companyName}</td>
                <td className="px-4 py-3 text-right tabular-nums">{h.shares.toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {!h.resolved ? (
                    <span className="inline-block w-16 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                  ) : h.currentPrice !== undefined ? (
                    formatNumber(h.currentPrice, 2, h.quoteCurrency ?? h.currency)
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {!h.resolved ? (
                    <span className="inline-block w-20 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                  ) : h.marketValueBase !== undefined ? (
                    formatNumber(h.marketValueBase, 0, baseCurrency)
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {!h.resolved ? (
                    <span className="inline-block w-14 h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                  ) : h.dayChangePercent !== undefined ? (
                    <span className={h.dayChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                      {formatPercent(h.dayChangePercent)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {h.peRatio !== undefined ? h.peRatio.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {h.dividendYield !== undefined ? `${(h.dividendYield * 100).toFixed(2)}%` : '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-300">
                  {h.sector ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
