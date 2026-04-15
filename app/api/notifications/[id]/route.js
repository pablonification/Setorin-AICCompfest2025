import { json, tryJsonFetch } from '../../../../mock/server';

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const backendUrl = `${process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000'}/notifications/${id}`;
    
    const data = await tryJsonFetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return json(data);
  } catch (error) {
    console.error('Error deleting notification:', error);
    return json({ success: true, id: params.id });
  }
}
