import { MOCK_PERSONAL_STATS } from '../../../mock/data';
import { json, tryJsonFetch } from '../../../mock/server';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await tryJsonFetch(`${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/statistics/personal`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return json(data);
  } catch (error) {
    console.error('Statistics API error:', error);
    return json(MOCK_PERSONAL_STATS);
  }
}
