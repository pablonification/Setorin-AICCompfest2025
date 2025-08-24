import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000';
    const healthUrl = `${backendUrl}/rag/health`;
    
    const resp = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!resp.ok) {
      return NextResponse.json({ 
        status: 'unhealthy',
        error: `Backend health check failed: ${resp.status}` 
      }, { status: 503 });
    }
    
    const data = await resp.json();
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('RAG health check error:', err);
    return NextResponse.json({ 
      status: 'unhealthy',
      error: 'Cannot connect to backend service' 
    }, { status: 503 });
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    if (!body.query || typeof body.query !== 'string') {
      return NextResponse.json({ error: 'Query field is required and must be a string' }, { status: 400 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_CONTAINER_API_URL || 'http://localhost:8000';
    const ragUrl = `${backendUrl}/rag/query`;
    
    console.log(`Forwarding RAG query to: ${ragUrl}`);
    
    const resp = await fetch(ragUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      console.error(`Backend RAG error: ${resp.status} ${resp.statusText}`);
      
      // Handle specific backend errors
      if (resp.status === 503) {
        return NextResponse.json({ 
          error: 'RAG service is currently unavailable. Please try again later.' 
        }, { status: 503 });
      }
      
      if (resp.status === 500) {
        return NextResponse.json({ 
          error: 'Internal server error in RAG service. Please try again later.' 
        }, { status: 500 });
      }
      
      // Forward the backend error
      try {
        const errorData = await resp.json();
        return NextResponse.json({ 
          error: errorData.detail || errorData.error || 'Backend service error' 
        }, { status: resp.status });
      } catch {
        return NextResponse.json({ 
          error: `Backend service error: ${resp.status} ${resp.statusText}` 
        }, { status: resp.status });
      }
    }

    let data;
    try {
      data = await resp.json();
    } catch (parseError) {
      console.error('Failed to parse backend response:', parseError);
      return NextResponse.json({ 
        error: 'Invalid response format from backend service' 
      }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('RAG API route error:', err);
    
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      return NextResponse.json({ 
        error: 'Cannot connect to backend service. Please check your connection.' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error. Please try again later.' 
    }, { status: 500 });
  }
}
