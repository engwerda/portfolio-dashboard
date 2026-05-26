import { useCallback, useState } from 'react';
import type { RawHolding, ParseWarning } from '../types';
import { parseCsv } from '../utils/csvParser';

interface Props {
  onParsed: (holdings: RawHolding[], warnings: ParseWarning[]) => void;
}

export function CsvUpload({ onParsed }: Props) {
  const [dragging, setDragging] = useState(false);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseCsv(text, { fileName: file.name });
        setWarnings(result.warnings);
        if (result.holdings.length > 0) {
          onParsed(result.holdings, result.warnings);
        }
      };
      reader.readAsText(file);
    },
    [onParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Portfolio Snapshot</h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">
          Upload a CSV snapshot to get a health check on your portfolio
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`
          relative rounded-2xl border-2 border-dashed p-12 text-center transition-all cursor-pointer
          ${dragging
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
            : 'border-gray-300 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500'
          }
        `}
        onClick={() => document.getElementById('csv-input')?.click()}
      >
        <input
          id="csv-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleInputChange}
        />
        <svg className="mx-auto w-12 h-12 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="mt-4 text-lg font-medium text-gray-700 dark:text-slate-300">
          {dragging ? 'Drop your CSV here' : 'Drag & drop your portfolio CSV'}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          or click to browse — supports common portfolio CSV formats (Ticker/CIQ Ticker, Shares/No. shares, Currency/trading_currency)
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">CSV Warnings</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-400">
                <span className={w.type === 'skipped' ? 'text-rose-600 dark:text-rose-400' : ''}>
                  {w.type === 'skipped' ? '⊘' : '🔧'}
                </span>{' '}
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
