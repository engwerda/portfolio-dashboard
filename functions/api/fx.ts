interface Env {}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

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
          // Try the requested pair first
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(pair)}?range=1d&interval=1d`,
            { headers: { 'User-Agent': UA } }
          );
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;

          // If direct pair returned 0 or null, try the inverse pair
          if (!price && pair.endsWith('=X')) {
            // e.g. VNDUSD=X → USDVND=X
            const currencies = pair.slice(0, -2); // strip =X
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
                // Store as 1/rate so client can use it directly
                results[pair] = 1 / invPrice;
                return;
              }
            } catch {
              // Inverse also failed
            }
          }

          results[pair] = price ?? null;
        } catch {
          results[pair] = null;
        }
      })
    );

    return new Response(JSON.stringify({ rates: results }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
