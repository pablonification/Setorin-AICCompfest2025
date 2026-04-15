import { getMockNotificationsPayload } from '../../mock/data';
import { json, tryJsonFetch } from '../../mock/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const unreadOnly = searchParams.get('unread_only') || 'false';
    
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || token === 'null') {
      return json({ error: 'Unauthorized - No valid token' }, { status: 401 });
    }
    
    // Use the correct backend URL from environment
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://backend:8000'}/notifications?limit=${limit}&unread_only=${unreadOnly}`;
    
    console.log('Calling backend URL:', backendUrl);
    console.log('Token:', token ? `${token.substring(0, 10)}...` : 'null');
    
    const data = await tryJsonFetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return json(data);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    const { searchParams } = new URL(request.url);
    return json(getMockNotificationsPayload({
      limit: searchParams.get('limit') || 50,
      unreadOnly: searchParams.get('unread_only') === 'true',
    }));
  }
}
