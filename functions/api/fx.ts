interface Env {}

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const pairs = url.searchParams.get('pairs');

  if (!pairs) {
    return new Response(JSON.stringify({ error: 'Missing pairs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const pairList = pairs.split(',');
    const results: Record<string, number | null> = {};

    await Promise.all(
      pairList.map(async (pair) => {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?range=1d&interval=1d`,
            { headers: HEADERS }
          );
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          results[pair] = meta?.regularMarketPrice ?? null;
        } catch {
          results[pair] = null;
        }
      })
    );

    return new Response(JSON.stringify({ rates: results }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600', // 10 min cache
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
