import type { BaseCurrency } from '../types';
import { formatNumber } from '../utils/format';

interface Props {
  totalValue: number | null;
  totalDayChange: number | null;
  totalDayChangePercent: number | null;
  baseCurrency: BaseCurrency;
  holdingCount: number;
  resolvedCount: number;
}

export function TotalValueCard({ totalValue, totalDayChange, totalDayChangePercent, baseCurrency, holdingCount, resolvedCount }: Props) {
  const isPositive = totalDayChange !== null && totalDayChange >= 0;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="stat-label">Total Portfolio Value</p>
          <p className="stat-value mt-1">
            {totalValue !== null
              ? `${formatNumber(totalValue, 0, baseCurrency)}`
              : '—'}
          </p>
        </div>
        <div className="text-right">
          {totalDayChange !== null && totalDayChangePercent !== null && (
            <>
              <p className={`text-lg font-semibold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {isPositive ? '+' : ''}{formatNumber(totalDayChange, 0, baseCurrency)}
              </p>
              <span className={isPositive ? 'badge-positive' : 'badge-negative'}>
                {isPositive ? '▲' : '▼'} {Math.abs(totalDayChangePercent).toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
        <span>{resolvedCount}/{holdingCount} holdings loaded</span>
        <span>Base: {baseCurrency}</span>
      </div>
    </div>
  );
}
