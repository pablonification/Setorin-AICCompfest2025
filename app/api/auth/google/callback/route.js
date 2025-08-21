import { NextRequest, NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    // Proxy the request to the backend
    // Try multiple bases to support both local dev and Docker networks
    const candidates = [
      process.env.NEXT_PUBLIC_CONTAINER_API_URL,
      'http://backend:8000',
      process.env.NEXT_PUBLIC_BROWSER_API_URL,
      'http://localhost:8000',
    ].filter(Boolean);

    let lastNetworkError = null;
    let data = null;
    for (const base of candidates) {
      const backendUrl = `${base}/auth/google/callback?code=${code}`;
      try {
        const backendResponse = await fetch(backendUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!backendResponse.ok) {
          const errorData = await backendResponse.json().catch(() => ({ error: `Status ${backendResponse.status}` }));
          return NextResponse.json(errorData, { status: backendResponse.status });
        }
        data = await backendResponse.json();
        // Success
        break;
      } catch (err) {
        lastNetworkError = err;
        continue;
      }
    }

    if (!data) {
      const message = lastNetworkError?.message || 'Auth backend unreachable';
      return NextResponse.json({ error: message }, { status: 502 });
    }
    
    // Return response with cache control headers
    const response = NextResponse.json(data);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
    
  } catch (error) {
    console.error('Auth callback proxy error:', error);
    const message = error?.message || 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
