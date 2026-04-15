import { getMockEducationBySlug } from '../../../mock/data';
import { json, tryJsonFetch } from '../../../mock/server';

export async function GET(_, { params }) {
  try {
    const { slug } = params;
    const base = process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000';
    const data = await tryJsonFetch(`${base}/education/slug/${encodeURIComponent(slug)}`);
    return json(data);
  } catch (error) {
    console.error('Infoin detail API error:', error);
    const item = getMockEducationBySlug(params.slug);
    return item ? json(item) : json({ error: 'Infoin detail not found' }, { status: 404 });
  }
}

