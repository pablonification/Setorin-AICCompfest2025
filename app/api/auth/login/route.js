import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();

    const candidates = [
      process.env.NEXT_PUBLIC_CONTAINER_API_URL,
      'http://backend:8000',
      process.env.NEXT_PUBLIC_BROWSER_API_URL,
      'http://localhost:8000',
      'http://127.0.0.1:8000',
    ].filter(Boolean);

    let lastNetworkError = null;
    let data = null;
    const errors = [];

    for (const base of candidates) {
      const backendUrl = `${base}/auth/login`;

      try {
        const backendResponse = await fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!backendResponse.ok) {
          const errorData = await backendResponse
            .json()
            .catch(() => ({ error: `Status ${backendResponse.status}` }));
          return NextResponse.json(errorData, { status: backendResponse.status });
        }

        data = await backendResponse.json();
        break;
      } catch (error) {
        lastNetworkError = error;
        errors.push(`${backendUrl}: ${error?.message || 'fetch failed'}`);
      }
    }

    if (!data) {
      return NextResponse.json(
        {
          error: lastNetworkError?.message || 'Auth backend unreachable',
          detail: errors.join(' | '),
        },
        { status: 502 }
      );
    }

    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Local auth proxy error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
