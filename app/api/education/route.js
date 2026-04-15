import { getMockEducationList } from '../../mock/data';
import { json, tryJsonFetch } from '../../mock/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 50;
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/education?limit=${limit}`;

    const data = await tryJsonFetch(backendUrl);
    return json(data);
  } catch (error) {
    console.error('Education API list error:', error);
    const { searchParams } = new URL(request.url);
    return json({ items: getMockEducationList({
      limit: searchParams.get('limit') || 50,
      category: searchParams.get('category'),
      q: searchParams.get('q'),
    }) });
  }
}
