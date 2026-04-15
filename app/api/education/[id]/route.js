import { getMockEducationById } from '../../../mock/data';
import { json, tryJsonFetch } from '../../../mock/server';

export async function GET(_, { params }) {
  try {
    const { id } = params;
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/education/${id}`;

    const data = await tryJsonFetch(backendUrl);
    return json(data);
  } catch (error) {
    console.error('Education API detail error:', error);
    const item = getMockEducationById(params.id);
    return item ? json(item) : json({ error: 'Content not found' }, { status: 404 });
  }
}
