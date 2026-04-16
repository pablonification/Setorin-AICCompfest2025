import { NextResponse } from 'next/server';

export async function GET(_, { params }) {
  try {
    const { id } = params;
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/education/${id}`;

    const res = await fetch(backendUrl);
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.detail || 'Failed to fetch content' }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Education API detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
