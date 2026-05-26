import { Doughnut } from 'react-chartjs-2';
import type { EnrichedHolding } from '../types';
import { useDarkMode } from '../context';

const CHART_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#22c55e',
];

interface Props {
  holdings: EnrichedHolding[];
}

export function SectorChart({ holdings }: Props) {
  const resolved = holdings.filter((h) => h.resolved && !h.failed && h.marketValueBase !== undefined);

  if (resolved.length === 0) {
    const hasUnresolved = holdings.some((h) => !h.resolved);
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold mb-4">Sector Allocation</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400">{hasUnresolved ? 'Loading data...' : 'No data available'}</p>
      </div>
    );
  }

  const sectorMap = new Map<string, number>();
  for (const h of resolved) {
    const sector = h.sector || 'Unknown';
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + (h.marketValueBase ?? 0));
  }

  const labels = [...sectorMap.keys()];
  const values = [...sectorMap.values()];
  const total = values.reduce((a, b) => a + b, 0);

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
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
      <h3 className="text-lg font-semibold mb-4">Sector Allocation</h3>
      <div className="h-64">
        <Doughnut key={isDark ? 'dark' : 'light'} data={data} options={options} />
      </div>
    </div>
  );
}
