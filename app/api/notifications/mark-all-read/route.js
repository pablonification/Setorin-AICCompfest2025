import { json, tryJsonFetch } from '../../../mock/server';

export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/notifications/mark-all-read`;
    
    const data = await tryJsonFetch(backendUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return json(data);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return json({ success: true });
  }
}
