# Portfolio Snapshot Dashboard

A privacy-first portfolio analytics dashboard that runs entirely in the browser. Upload a CSV export of your stock holdings and get instant visualizations — sector allocations, currency breakdowns, live prices, and dividend yield estimates — all without your data ever leaving the browser.

<p align="center">
  <em>Ticker enrichment · Sector & currency charts · Dark mode · Offline-capable after load</em>
</p>

---

## Features

- **CSV Upload** — Flexible parser recognizes dozens of column aliases (Date, Ticker, Shares, Currency, Price, Sector, Industry, etc.) from various broker/portfolio export formats. Handles BOM, blank rows, fixed-width encodings, and accounting-style negatives.
- **Automatic Ticker Resolution** — Maps exchange-prefixed tickers (e.g. `SEHK:0700`, `HOSE:VIC`) to Yahoo Finance symbols and resolves unknown tickers via search.
- **Live Market Data** — Current price, day change, P/E ratio, dividend yield, market cap, and EPS via a Cloudflare Worker proxy to Yahoo Finance APIs.
- **Sector Allocation** — Donut chart of holdings grouped by GICS sector, with drill-down to industry detail.
- **Currency Breakdown** — Stacked bar chart of portfolio value by quote currency, with exchange rates fetched in real time.
- **Holdings Table** — Sortable table with ticker, shares, price, value, day change, and fundamentals.
- **Total Value Card** — Configurable base currency with live FX conversion so you can see your portfolio in USD, EUR, GBP, etc. when holdings span multiple currencies.
- **Dark Mode** — Persisted to localStorage, follows system preference on first visit.
- **Local Persistence** — Portfolio data is stored in localStorage so you can refresh without re-uploading. Nothing is sent to any server.
- **Deployed on Cloudflare Pages** — Static React SPA with Cloudflare Functions backend for proxying Yahoo Finance API calls and currency conversion.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 3, `@tailwindcss/forms` |
| Charts | Chart.js via `react-chartjs-2` |
| CSV Parsing | PapaParse |
| Backend | Cloudflare Pages Functions (Workers) |
| Testing | esbuild-based test runner, Node.js test assertions |
| Deployment | Wrangler (`npm run deploy`) |

## Project Structure

```
portfolio-dashboard/
├── src/
│   ├── api/             # Quote enrichment, FX rate fetching
│   ├── components/      # React components (Dashboard, Charts, Table, Upload)
│   ├── utils/           # CSV parser, ticker mapper, date parser, formatters
│   ├── App.tsx          # Root component with routing and state
│   ├── context.ts       # Dark mode context provider
│   ├── types.ts         # TypeScript interfaces
│   └── main.tsx         # Entry point
├── functions/api/       # Cloudflare Functions (quote, search, FX proxies)
├── tests/               # Unit tests (csvParser, enrich, tickerMapper)
├── scripts/             # Test runner
├── public/              # Static assets
├── vite.config.ts       # Vite config with Yahoo API dev proxy plugin
└── wrangler.toml        # Cloudflare deployment config
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9

### Install

```bash
npm install
```

### Development

Start the Vite dev server. The built-in proxy plugin handles Yahoo Finance API calls locally:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

Outputs to `dist/`.

### Test

```bash
npm test
```

Tests use a lightweight esbuild-based runner (`scripts/run-tests.mjs`). Test files live in `tests/` and follow the pattern `*.test.ts`.

### Deploy

```bash
npm run deploy
```

This builds the project and deploys to Cloudflare Pages. Requires the Wrangler CLI to be authenticated.

## CSV Format

The parser is designed to handle most broker/portfolio exports. The following columns are recognized (case-insensitive, trimmed, parentheticals ignored):

### Required

| Field | Aliases |
|-------|---------|
| **Ticker** | `Ticker`, `CIQ Ticker`, `Symbol`, `Security Ticker`, `Yahoo Ticker`, `Code` |
| **Shares** | `Shares`, `No. shares`, `Quantity`, `Units`, `Position`, `Holdings` |

### Optional

| Field | Aliases |
|-------|---------|
| **Date** | `Date`, `as_of_date`, `Snapshot Date`, `Portfolio Date` |
| **Company Name** | `Company Name`, `Company`, `Name`, `Security Name` |
| **Currency** | `Currency`, `Trading Currency`, `Quote Currency` |
| **Price** | `Close Price`, `Last Price`, `Market Price` |
| **Sector** | `Sector`, `Industry` |
| **Industry** | `GICS Sub-Industry`, `Sub-Industry`, `Industry Group` |

Tickers can include exchange prefixes (e.g. `SEHK:0700`, `HOSE:VIC`) and the parser will automatically infer the trading currency from the exchange.

Missing currencies are inferred from a lookup table of 20+ exchanges and countries, defaulting to USD.

## Architecture

### Data Flow

```
CSV File → PapaParse → RawHolding[] → Ticker Mapping → EnrichedHolding[] → Yahoo API → Dashboard
```

1. User uploads a CSV via the `CsvUpload` component.
2. `csvParser.ts` validates and normalizes rows into `RawHolding[]`, surfacing fix/skip warnings.
3. `tickerMapper.ts` converts exchange-prefixed tickers to Yahoo-compatible symbols (e.g. `SEHK:0700` → `0700.HK`, `HOSE:VIC` → `VIC.VN`), falling back to Yahoo Search when unknown.
4. `enrich.ts` fetches live quotes, sector, and fundamentals from Yahoo Finance through the Cloudflare Function proxy.
5. Dashboard renders charts and tables from enriched data.

### API Proxies

The Cloudflare Functions layer handles two challenges with Yahoo Finance:

1. **Crumb Authentication** — Yahoo's quote summary endpoint requires a session cookie + crumb token. The proxy fetches and caches this for 8 minutes.
2. **CORS** — Yahoo Finance APIs don't set CORS headers, so the proxy acts as a same-origin bridge.

Endpoints:

- `GET /api/quote?ticker=TSLA` — Returns chart data, search results, and summary fundamentals.
- `GET /api/search?q=tencent` — Ticker name search.
- `GET /api/fx?pairs=USDEUR=X,USDVND=X` — Batch exchange rate lookup.

During local development, a Vite plugin in `vite.config.ts` provides these same endpoints.

## License

MIT
