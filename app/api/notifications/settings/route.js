import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || token === 'null') {
      return NextResponse.json({ error: 'Unauthorized - No valid token' }, { status: 401 });
    }
    
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://backend:8000'}/notifications/settings`;
    
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
    console.error('Error fetching notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification settings', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || token === 'null') {
      return NextResponse.json({ error: 'Unauthorized - No valid token' }, { status: 401 });
    }
    
    const body = await request.json();
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://backend:8000'}/notifications/settings`;
    
    const response = await fetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error ${response.status}:`, errorText);
      throw new Error(`Backend responded with ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return NextResponse.json(
      { error: 'Failed to update notification settings', details: error.message },
      { status: 500 }
    );
  }
}
