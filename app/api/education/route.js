import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 50;
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/education?limit=${limit}`;

    const res = await fetch(backendUrl);
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.detail || 'Failed to fetch education' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Education API list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
