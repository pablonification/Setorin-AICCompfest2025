import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 100;
    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const base = process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000';

    const url = new URL(`${base}/education/`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('published_only', 'true');
    if (category) url.searchParams.set('category', category);
    if (q) url.searchParams.set('q', q);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.detail || 'Failed to fetch infoin' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Infoin API list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


