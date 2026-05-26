interface Env {}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const ticker = url.searchParams.get('ticker');

  if (!ticker) {
    return new Response(JSON.stringify({ error: 'Missing ticker' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Chart data for price (no auth required)
    const chartPromise = fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d&includePrePost=false`,
      { headers: { 'User-Agent': UA } }
    );

    // Search data for sector/industry (no auth required)
    const searchPromise = fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(ticker)}&quotesCount=1&newsCount=0`,
      { headers: { 'User-Agent': UA } }
    );

    const [chartRes, searchRes] = await Promise.all([chartPromise, searchPromise]);

    const chartData = await chartRes.json();
    const searchData = await searchRes.json();

    return new Response(JSON.stringify({ chart: chartData, search: searchData }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
