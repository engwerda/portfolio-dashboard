interface Env {}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Cache auth credentials per Worker instance
let cachedAuth: { cookie: string; crumb: string; expires: number } | null = null;

async function getYahooAuth(): Promise<{ cookie: string; crumb: string }> {
  if (cachedAuth && Date.now() < cachedAuth.expires) {
    return { cookie: cachedAuth.cookie, crumb: cachedAuth.crumb };
  }

  // Step 1: Get session cookies from Yahoo consent endpoint
  const consentRes = await fetch('https://guce.yahoo.com/consent?gcrumb=&sessionId=&lang=en-US', {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });

  const setCookies = consentRes.headers.getSetCookie?.() || [];
  const cookie = setCookies.map((c: string) => c.split(';')[0]).join('; ');

  // Step 2: Get crumb using the cookies
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: cookie },
  });

  if (!crumbRes.ok) {
    throw new Error(`Failed to get crumb: ${crumbRes.status}`);
  }

  const crumb = await crumbRes.text();

  // Cache for 8 minutes
  cachedAuth = { cookie, crumb, expires: Date.now() + 8 * 60 * 1000 };

  return { cookie, crumb };
}

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
    // Fetch chart (price) + search (sector) + auth in parallel
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
      // Summary is optional — price + sector are sufficient
    }

    return new Response(JSON.stringify({ chart: chartData, search: searchData, summary: summaryData }), {
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
