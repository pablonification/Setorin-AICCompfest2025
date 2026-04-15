import { MOCK_NOTIFICATION_SETTINGS } from '../../../mock/data';
import { json, tryJsonFetch } from '../../../mock/server';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || token === 'null') {
      return json({ error: 'Unauthorized - No valid token' }, { status: 401 });
    }
    
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://backend:8000'}/notifications/settings`;
    
    const data = await tryJsonFetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return json(data);
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return json(MOCK_NOTIFICATION_SETTINGS);
  }
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));

  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || token === 'null') {
      return json({ error: 'Unauthorized - No valid token' }, { status: 401 });
    }
    
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://backend:8000'}/notifications/settings`;
    
    const data = await tryJsonFetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return json(data);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return json({ ...MOCK_NOTIFICATION_SETTINGS, ...body, success: true });
  }
}
