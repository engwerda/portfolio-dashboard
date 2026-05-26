import { Bar } from 'react-chartjs-2';
import type { EnrichedHolding } from '../types';
import { useDarkMode } from '../context';

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#22c55e',
];

interface Props {
  holdings: EnrichedHolding[];
  baseCurrency: string;
}

export function HoldingsChart({ holdings, baseCurrency }: Props) {
  const resolved = holdings
    .filter((h) => h.resolved && !h.failed && h.marketValueBase !== undefined)
    .sort((a, b) => (b.marketValueBase ?? 0) - (a.marketValueBase ?? 0));

  if (resolved.length === 0) {
    const hasUnresolved = holdings.some((h) => !h.resolved);
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Holdings by Value</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">{hasUnresolved ? 'Loading data...' : 'No data available'}</p>
      </div>
    );
  }

  // Map sectors to colors
  const sectors = [...new Set(resolved.map((h) => h.sector || 'Unknown'))];
  const sectorColorMap = new Map(sectors.map((s, i) => [s, CHART_COLORS[i % CHART_COLORS.length]]));

  const labels = resolved.map((h) => h.ticker.split(':').pop() || h.ticker);
  const values = resolved.map((h) => h.marketValueBase ?? 0);
  const colors = resolved.map((h) => sectorColorMap.get(h.sector || 'Unknown') || '#6b7280');

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderColor: 'transparent',
      borderWidth: 0,
      borderRadius: 4,
    }],
  };

  const isDark = useDarkMode();

  // Dynamic height based on number of holdings
  const chartHeight = Math.max(200, resolved.length * 32);

  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            return ` ${new Intl.NumberFormat('en-US', { style: 'currency', currency: baseCurrency, notation: 'compact' }).format(ctx.parsed.x)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#94a3b8' : '#6b7280',
          callback: (value: any) => {
            if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
            if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
            return `$${value}`;
          },
        },
        grid: {
          color: isDark ? '#334155' : 'rgba(0,0,0,0.05)',
        },
      },
      y: {
        ticks: {
          color: isDark ? '#e2e8f0' : '#6b7280',
          font: { size: 11, weight: 'bold' as const },
        },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Holdings by Value</h3>
        <div className="flex flex-wrap gap-2">
          {sectors.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: sectorColorMap.get(s) }}
              />
              {s}
            </span>
          ))}
        </div>
      </div>
      <div style={{ height: chartHeight }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
