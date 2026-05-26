import { Doughnut } from 'react-chartjs-2';
import type { EnrichedHolding } from '../types';
import { useDarkMode } from '../context';

const CURRENCY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

interface Props {
  holdings: EnrichedHolding[];
}

export function CurrencyChart({ holdings }: Props) {
  const resolved = holdings.filter((h) => h.resolved && !h.failed && h.marketValueBase !== undefined);

  if (resolved.length === 0) {
    const hasUnresolved = holdings.some((h) => !h.resolved);
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Currency Exposure</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">{hasUnresolved ? 'Loading data...' : 'No data available'}</p>
      </div>
    );
  }

  const currencyMap = new Map<string, number>();
  for (const h of resolved) {
    // Use original currency (pre-FX conversion) to show exposure
    const currency = h.quoteCurrency || h.currency;
    const value = h.currentPrice !== undefined ? h.shares * h.currentPrice : 0;
    currencyMap.set(currency, (currencyMap.get(currency) || 0) + value);
  }

  const labels = [...currencyMap.keys()];
  const values = [...currencyMap.values()];
  const total = values.reduce((a, b) => a + b, 0);

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: labels.map((_, i) => CURRENCY_COLORS[i % CURRENCY_COLORS.length]),
      borderColor: 'transparent',
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const isDark = useDarkMode();
  const legendTextColor = isDark ? '#e2e8f0' : '#374151';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: legendTextColor,
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
          generateLabels: (chart: any) => {
            const dataset = chart.data.datasets[0];
            return chart.data.labels.map((label: string, i: number) => ({
              text: `${label} (${((dataset.data[i] / total) * 100).toFixed(1)}%)`,
              fillStyle: dataset.backgroundColor[i],
              strokeStyle: 'transparent',
              fontColor: legendTextColor,
              hidden: false,
              index: i,
              pointStyle: 'circle' as const,
            }));
          },
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1e293b' : '#fff',
        titleColor: isDark ? '#e2e8f0' : '#111827',
        bodyColor: isDark ? '#cbd5e1' : '#374151',
        borderColor: isDark ? '#334155' : '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (ctx: any) => {
            const val = ctx.parsed;
            const pct = ((val / total) * 100).toFixed(1);
            return ` ${ctx.label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold mb-4">Currency Exposure</h3>
      <div className="h-64">
        <Doughnut key={isDark ? 'dark' : 'light'} data={data} options={options} />
      </div>
    </div>
  );
}
