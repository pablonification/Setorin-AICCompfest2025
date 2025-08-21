"""RAG Agent API endpoints for SmartBin knowledge base."""

from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

# Import RAG agent optionally; tolerate any initialization failure
try:
    from rag_agent import app  # noqa: F401
    RAG_AVAILABLE = True
except Exception:  # Catch all to prevent crashing the API if RAG setup fails
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
    request: QueryRequest,
    current_user: User = Depends(get_current_user)
):
    """Query the SmartBin knowledge base using the RAG agent."""
    if not RAG_AVAILABLE:
        raise HTTPException(status_code=503, detail="RAG agent not available")
    
    try:
        # Use the compiled LangGraph app to process the query
        final_state = app.invoke(
            {"messages": [HumanMessage(content=request.query)]},
            config={"configurable": {"thread_id": request.thread_id}}
        )
        
        # Extract the final answer
        final_message = final_state["messages"][-1]
        answer = final_message.content if hasattr(final_message, 'content') else str(final_message)
        
        return QueryResponse(
            answer=answer,
            thread_id=request.thread_id,
            message_count=len(final_state["messages"])
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG processing failed: {str(e)}")


@router.get("/threads/{thread_id}/history", response_model=ThreadHistoryResponse)
async def get_thread_history(
    thread_id: str,
    current_user: User = Depends(get_current_user)
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
