import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function yahooApiPlugin() {
  return {
    name: 'yahoo-api-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/quote', async (req: any, res: any) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const ticker = url.searchParams.get('ticker');
          if (!ticker) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing ticker' }));
            return;
          }

          const [chartRes, searchRes] = await Promise.all([
            fetch(
              `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d&includePrePost=false`,
              { headers: { 'User-Agent': UA } }
            ),
            fetch(
              `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=1&newsCount=0`,
              { headers: { 'User-Agent': UA } }
            ),
          ]);

          const chartData = await chartRes.json();
          const searchData = await searchRes.json();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ chart: chartData, search: searchData }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use('/api/search', async (req: any, res: any) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const q = url.searchParams.get('q');
          if (!q) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing query' }));
            return;
          }

          const searchRes = await fetch(
            `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=5`,
            { headers: { 'User-Agent': UA } }
          );
          const data = await searchRes.json();

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use('/api/fx', async (req: any, res: any) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const pairs = url.searchParams.get('pairs');
          if (!pairs) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing pairs' }));
            return;
          }

          const pairList = pairs.split(',');
          const results: Record<string, number | null> = {};

          await Promise.all(
            pairList.map(async (pair) => {
              try {
                const chartRes = await fetch(
                  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?range=1d&interval=1d`,
                  { headers: { 'User-Agent': UA } }
                );
                const data = await chartRes.json();
                const meta = data?.chart?.result?.[0]?.meta;
                results[pair] = meta?.regularMarketPrice ?? null;
              } catch {
                results[pair] = null;
              }
            })
          );

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ rates: results }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), yahooApiPlugin()],
});
