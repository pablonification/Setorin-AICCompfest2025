"""RAG Agent API endpoints for SmartBin knowledge base."""

from typing import List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

# Import RAG agent optionally to avoid circular imports
try:
    from ..rag_agent import app
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False
    app = None

from ..models.user import User
from ..routers.auth import get_current_user

router = APIRouter(prefix="/rag", tags=["rag"])


class QueryRequest(BaseModel):
    """Request model for RAG queries."""
    query: str
    thread_id: str = "default"


class QueryResponse(BaseModel):
    """Response model for RAG queries."""
    answer: str
    thread_id: str
    message_count: int


class Message(BaseModel):
    """Message model for conversation history."""
    role: str
    content: str
    timestamp: str


class ThreadHistoryResponse(BaseModel):
    """Response model for thread history."""
    thread_id: str
    messages: List[Message]


@router.post("/query", response_model=QueryResponse)
async def query_knowledge_base(
    query_req: QueryRequest,
    request: Request
):
    """Query the SmartBin knowledge base using the RAG agent."""
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=503, detail="RAG agent not available")
    
    try:
        # Validate query
        if not query_req.query or not query_req.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        # Use the compiled LangGraph app to process the query
        try:
            final_state = app.invoke(
                {"messages": [HumanMessage(content=query_req.query)]},
                config={"configurable": {"thread_id": query_req.thread_id}}
            )
        except Exception as rag_error:
            print(f"RAG agent error: {rag_error}")
            raise HTTPException(status_code=500, detail=f"RAG processing failed: {str(rag_error)}")
        
        # Extract the final answer
        if not final_state or "messages" not in final_state:
            raise HTTPException(status_code=500, detail="Invalid response from RAG agent")
        
        messages = final_state["messages"]
        if not messages:
            raise HTTPException(status_code=500, detail="No response generated from RAG agent")
        
        final_message = messages[-1]
        if not final_message:
            raise HTTPException(status_code=500, detail="Invalid final message from RAG agent")
        
        # Extract content safely
        if hasattr(final_message, 'content'):
            answer = final_message.content
        elif isinstance(final_message, dict):
            answer = final_message.get('content', str(final_message))
        else:
            answer = str(final_message)
        
        if not answer or not answer.strip():
            raise HTTPException(status_code=500, detail="Empty response from RAG agent")
        
        return QueryResponse(
            answer=answer.strip(),
            thread_id=query_req.thread_id,
            message_count=len(messages)
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error in RAG query: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/threads/{thread_id}/history", response_model=ThreadHistoryResponse)
async def get_thread_history(
    thread_id: str,
    request: Request
):
    """Get conversation history for a specific thread."""
    try:
        # For now, return mock data since LangGraph checkpointing needs more setup
        # In production, you'd integrate with a proper checkpoint store
        return ThreadHistoryResponse(
            thread_id=thread_id,
            messages=[
                Message(
                    role="user",
                    content="Sample user query",
                    timestamp="2024-01-01T00:00:00Z"
                ),
                Message(
                    role="assistant", 
                    content="Sample RAG response",
                    timestamp="2024-01-01T00:00:01Z"
                )
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check for RAG service."""
    return {
        "status": "healthy" if RAG_AVAILABLE else "unavailable",
        "service": "rag_agent",
        "rag_available": RAG_AVAILABLE
    }
