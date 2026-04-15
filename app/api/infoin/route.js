import { getMockEducationList } from '../../mock/data';
import { json, tryJsonFetch } from '../../mock/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || 100;
    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const base = process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000';

    const url = new URL(`${base}/education/`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('published_only', 'true');
    if (category) url.searchParams.set('category', category);
    if (q) url.searchParams.set('q', q);

    const data = await tryJsonFetch(url.toString());
    return json(data);
  } catch (error) {
    console.error('Infoin API list error:', error);
    const { searchParams } = new URL(request.url);
    return json({ items: getMockEducationList({
      limit: searchParams.get('limit') || 100,
      category: searchParams.get('category'),
      q: searchParams.get('q'),
    }) });
  }
}
