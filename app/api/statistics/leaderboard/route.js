import { MOCK_LEADERBOARD } from '../../../mock/data';
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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 10;

    const data = await tryJsonFetch(
      `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/statistics/leaderboard?limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return json(data);
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return json(MOCK_LEADERBOARD);
  }
}
