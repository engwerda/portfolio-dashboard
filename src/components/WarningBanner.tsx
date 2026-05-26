import type { EnrichedHolding } from '../types';

interface Props {
  failedTickers: EnrichedHolding[];
}

export function WarningBanner({ failedTickers }: Props) {
  if (failedTickers.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {failedTickers.length} ticker{failedTickers.length > 1 ? 's' : ''} could not be enriched
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            {failedTickers.map((h) => h.ticker).join(', ')} — data may be unavailable for these exchanges.
          </p>
        </div>
      </div>
    </div>
  );
}
