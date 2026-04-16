import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const unreadOnly = searchParams.get('unread_only') || 'false';
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || token === 'null') {
      return NextResponse.json({ error: 'Unauthorized - No valid token' }, { status: 401 });
    }
    
    // Use the correct backend URL from environment
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://backend:8000'}/notifications?limit=${limit}&unread_only=${unreadOnly}`;
    
    console.log('Calling backend URL:', backendUrl);
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'null');
    
    const response = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error ${response.status}:`, errorText);
      throw new Error(`Backend responded with ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}
