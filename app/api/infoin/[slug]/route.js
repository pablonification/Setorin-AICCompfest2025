import { NextResponse } from 'next/server';

export async function GET(_, { params }) {
  try {
    const { slug } = params;
    const base = process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000';
    const res = await fetch(`${base}/education/slug/${encodeURIComponent(slug)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.detail || 'Failed to fetch infoin detail' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Infoin detail API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


