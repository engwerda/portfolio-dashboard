import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Crumb auth cache for dev server
let cachedAuth: { cookie: string; crumb: string; expires: number } | null = null;

async function getYahooAuth(): Promise<{ cookie: string; crumb: string }> {
  if (cachedAuth && Date.now() < cachedAuth.expires) {
    return { cookie: cachedAuth.cookie, crumb: cachedAuth.crumb };
  }

  const consentRes = await fetch('https://guce.yahoo.com/consent?gcrumb=&sessionId=&lang=en-US', {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });

  const setCookies = consentRes.headers.getSetCookie?.() || [];
  const cookie = setCookies.map((c: string) => c.split(';')[0]).join('; ');

  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });

  if (!crumbRes.ok) {
    throw new Error(`Failed to get crumb: ${crumbRes.status}`);
  }

  const crumb = await crumbRes.text();
  cachedAuth = { cookie, crumb, expires: Date.now() + 8 * 60 * 1000 };

  return { cookie, crumb };
}

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

          const [chartRes, searchRes, auth] = await Promise.all([
            fetch(
              `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d&includePrePost=false`,
              { headers: { 'User-Agent': UA } }
            ),
            fetch(
              `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=1&newsCount=0`,
              { headers: { 'User-Agent': UA } }
            ),
            getYahooAuth(),
          ]);

          const chartData = await chartRes.json();
          const searchData = await searchRes.json();

          // Fetch fundamentals using crumb auth
          let summaryData: any = null;
          try {
            const summaryRes = await fetch(
              `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail,defaultKeyStatistics&crumb=${auth.crumb}`,
              { headers: { 'User-Agent': UA, Cookie: auth.cookie } }
            );
            if (summaryRes.ok) {
              summaryData = await summaryRes.json();
            }
          } catch {
            // Summary is optional
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ chart: chartData, search: searchData, summary: summaryData }));
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
                const price = meta?.regularMarketPrice;

                // If direct pair returned 0 or null, try the inverse
                if (!price && pair.endsWith('=X')) {
                  const currencies = pair.slice(0, -2);
                  const inverse = currencies.slice(3) + currencies.slice(0, 3) + '=X';
                  try {
                    const invRes = await fetch(
                      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(inverse)}?range=1d&interval=1d`,
                      { headers: { 'User-Agent': UA } }
                    );
                    const invData = await invRes.json();
                    const invMeta = invData?.chart?.result?.[0]?.meta;
                    const invPrice = invMeta?.regularMarketPrice;
                    if (invPrice) {
                      results[pair] = 1 / invPrice;
                      return;
                    }
                  } catch {}
                }

                results[pair] = price ?? null;
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
