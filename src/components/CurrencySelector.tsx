import type { BaseCurrency } from '../types';

const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'SGD',
  'INR', 'KRW', 'TWD', 'THB', 'VND', 'BRL', 'MXN', 'ZAR', 'SEK', 'NOK',
  'DKK', 'NZD', 'PLN', 'CZK', 'HUF', 'ILS', 'PHP', 'MYR', 'IDR',
];

interface Props {
  value: BaseCurrency;
  onChange: (currency: BaseCurrency) => void;
}

export function CurrencySelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="base-currency" className="text-sm font-medium text-gray-500 dark:text-slate-400">
        Base:
      </label>
      <select
        id="base-currency"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-emerald-500"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
