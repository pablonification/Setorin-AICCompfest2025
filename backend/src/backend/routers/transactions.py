"""Transaction router for SmartBin backend."""

from __future__ import annotations

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..services.transaction_service import get_transaction_service
from ..db.mongo import ensure_connection
from ..routers.auth import verify_token
from ..models.transaction import TransactionResponse

router = APIRouter(prefix="/api", tags=["transactions"])
logger = logging.getLogger(__name__)

transaction_service = get_transaction_service()


@router.get("/transactions", response_model=List[TransactionResponse])
async def get_user_transactions(
    limit: int = Query(default=20, ge=1, le=100, description="Number of transactions to return"),
    offset: int = Query(default=0, ge=0, description="Number of transactions to skip"),
    payload: dict = Depends(verify_token)
):
    """Get user's transaction history with pagination."""
    try:
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        # Resolve user's ObjectId by email
        db = await ensure_connection()
        user_doc = await db.users.find_one({"email": user_email})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = str(user_doc["_id"])  # Use ObjectId string for repository
        
        transactions = await transaction_service.get_user_transactions(
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        
        logger.info("Retrieved %d transactions for user %s (limit: %d, offset: %d)", 
                   len(transactions), user_email, limit, offset)
        
        return transactions
        
    except Exception as exc:
        logger.error("Failed to fetch user transactions: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch transaction history")


@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction_details(
    transaction_id: str,
    payload: dict = Depends(verify_token)
):
    """Get details of a specific transaction."""
    try:
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        # Resolve user's ObjectId by email
        db = await ensure_connection()
        user_doc = await db.users.find_one({"email": user_email})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = str(user_doc["_id"])  # Use ObjectId string
        
        # Get transaction by scan_id (since we don't have direct transaction ID lookup yet)
        transaction = await transaction_service.get_transaction_by_scan_id(transaction_id)
        
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        # Verify the transaction belongs to the authenticated user
        if transaction.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this transaction")
        
        return transaction
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to fetch transaction %s: %s", transaction_id, exc)
        raise HTTPException(status_code=500, detail="Failed to fetch transaction details")


@router.get("/transactions/summary")
async def get_user_transaction_summary(
    payload: dict = Depends(verify_token)
):
    """Get user's transaction summary and statistics."""
    try:
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        # Resolve user's ObjectId by email
        db = await ensure_connection()
        user_doc = await db.users.find_one({"email": user_email})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = str(user_doc["_id"])  # Use ObjectId string
        
        summary = await transaction_service.get_user_transaction_summary(user_id)
        count = await transaction_service.get_user_transaction_count(user_id)
        
        # Add count to summary
        summary["total_transactions"] = count
        
        logger.info("Retrieved transaction summary for user %s: %s", user_email, summary)
        
        return summary
        
    except Exception as exc:
        logger.error("Failed to fetch transaction summary for user: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch transaction summary")


@router.get("/transactions/count")
async def get_user_transaction_count(
    payload: dict = Depends(verify_token)
):
    """Get total number of transactions for the authenticated user."""
    try:
        user_email = payload.get("email")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid user token")
        
        # Resolve user's ObjectId by email
        db = await ensure_connection()
        user_doc = await db.users.find_one({"email": user_email})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        user_id = str(user_doc["_id"])  # Use ObjectId string
        
        count = await transaction_service.get_user_transaction_count(user_id)
        
        logger.debug("User %s has %d transactions", user_email, count)
        
        return {"total_transactions": count}
        
    except Exception as exc:
        logger.error("Failed to fetch transaction count for user: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to fetch transaction count")
