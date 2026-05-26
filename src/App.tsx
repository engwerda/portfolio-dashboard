import { useState, useEffect, useCallback } from 'react';
import type { RawHolding, ParseWarning } from './types';
import { CsvUpload } from './components/CsvUpload';
import { Dashboard } from './components/Dashboard';
import { ThemeToggle } from './components/ThemeToggle';
import { DarkModeContext } from './context';

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);
  const [holdings, setHoldings] = useState<RawHolding[] | null>(null);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);

  const handleParsed = useCallback((h: RawHolding[], w: ParseWarning[]) => {
    setHoldings(h);
    setWarnings(w);
    // Persist to localStorage
    localStorage.setItem('portfolio-holdings', JSON.stringify(h));
    localStorage.setItem('portfolio-warnings', JSON.stringify(w));
  }, []);

  const handleReset = useCallback(() => {
    setHoldings(null);
    setWarnings([]);
    localStorage.removeItem('portfolio-holdings');
    localStorage.removeItem('portfolio-warnings');
  }, []);

  // Restore from localStorage on mount
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    const stored = localStorage.getItem('portfolio-holdings');
    if (stored) {
      try {
        setHoldings(JSON.parse(stored));
        const storedWarnings = localStorage.getItem('portfolio-warnings');
        if (storedWarnings) setWarnings(JSON.parse(storedWarnings));
      } catch {}
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Top Bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="font-bold text-lg tracking-tight">Portfolio Snapshot</span>
          </div>
          <DarkModeContext.Provider value={isDark}>
            <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
          </DarkModeContext.Provider>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {holdings ? (
          <DarkModeContext.Provider value={isDark}>
            <Dashboard holdings={holdings} warnings={warnings} onReset={handleReset} />
          </DarkModeContext.Provider>
        ) : (
          <CsvUpload onParsed={handleParsed} />
        )}
      </main>
    </div>
  );
}
