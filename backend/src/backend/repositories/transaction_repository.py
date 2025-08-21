"""MongoDB implementation of transaction repository for SmartBin backend."""

from __future__ import annotations

import logging
from typing import Optional, List
from bson import ObjectId

from motor.motor_asyncio import AsyncIOMotorCollection

from src.backend.domain.interfaces.transaction_repository import TransactionRepository
from src.backend.models.transaction import Transaction, TransactionCreate
from src.backend.db.mongo import ensure_connection

logger = logging.getLogger(__name__)


class MongoDBTransactionRepository(TransactionRepository):
    """MongoDB implementation of transaction repository."""
    
    def __init__(self):
        """Initialize the MongoDB transaction repository."""
        self.collection: Optional[AsyncIOMotorCollection] = None
    
    async def _get_collection(self) -> AsyncIOMotorCollection:
        """Get the transactions collection, ensuring it exists."""
        if not self.collection:
            db = await ensure_connection()
            self.collection = db.transactions
        return self.collection
    
    async def create_transaction(self, transaction: TransactionCreate) -> Optional[Transaction]:
        """Create a new transaction record."""
        try:
            collection = await self._get_collection()
            
            # Convert string IDs to ObjectId
            transaction_doc = {
                "user_id": ObjectId(transaction.user_id),
                "scan_id": ObjectId(transaction.scan_id),
                "amount": transaction.amount,
                "created_at": transaction.created_at
            }
            
            # Insert transaction into database
            result = await collection.insert_one(transaction_doc)
            
            if result.inserted_id:
                # Return the created transaction
                created_transaction = Transaction(
                    id=result.inserted_id,
                    user_id=ObjectId(transaction.user_id),
                    scan_id=ObjectId(transaction.scan_id),
                    amount=transaction.amount,
                    created_at=transaction.created_at
                )
                
                logger.info("Created transaction with ID: %s for user: %s, scan: %s, amount: %d", 
                           result.inserted_id, transaction.user_id, transaction.scan_id, transaction.amount)
                return created_transaction
            
            return None
            
        except Exception as e:
            logger.error("Failed to create transaction: %s", e)
            raise RuntimeError(f"Failed to create transaction: {e}") from e
    
    async def get_transaction_by_id(self, transaction_id: str) -> Optional[Transaction]:
        """Get transaction by ID."""
        try:
            collection = await self._get_collection()
            
            # Convert string ID to ObjectId
            object_id = ObjectId(transaction_id)
            
            # Find transaction by ID
            transaction_doc = await collection.find_one({"_id": object_id})
            
            if transaction_doc:
                # Convert MongoDB document to Transaction model
                transaction_doc["id"] = transaction_doc.pop("_id")
                return Transaction(**transaction_doc)
            
            return None
            
        except Exception as e:
            logger.error("Failed to get transaction by ID %s: %s", transaction_id, e)
            return None
    
    async def get_transactions_by_user_id(
        self, 
        user_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> List[Transaction]:
        """Get transactions for a specific user with pagination."""
        try:
            collection = await self._get_collection()
            
            # Convert string ID to ObjectId
            object_id = ObjectId(user_id)
            
            # Find transactions for user with pagination
            cursor = collection.find({"user_id": object_id}).sort("created_at", -1).skip(offset).limit(limit)
            
            transactions = []
            async for transaction_doc in cursor:
                # Convert MongoDB document to Transaction model
                transaction_doc["id"] = transaction_doc.pop("_id")
                transactions.append(Transaction(**transaction_doc))
            
            logger.info("Retrieved %d transactions for user %s (limit: %d, offset: %d)", 
                       len(transactions), user_id, limit, offset)
            return transactions
            
        except Exception as e:
            logger.error("Failed to get transactions for user %s: %s", user_id, e)
            return []
    
    async def get_transaction_by_scan_id(self, scan_id: str) -> Optional[Transaction]:
        """Get transaction by scan ID (one-to-one relationship)."""
        try:
            collection = await self._get_collection()
            
            # Convert string ID to ObjectId
            object_id = ObjectId(scan_id)
            
            # Find transaction by scan ID
            transaction_doc = await collection.find_one({"scan_id": object_id})
            
            if transaction_doc:
                # Convert MongoDB document to Transaction model
                transaction_doc["id"] = transaction_doc.pop("_id")
                return Transaction(**transaction_doc)
            
            return None
            
        except Exception as e:
            logger.error("Failed to get transaction by scan ID %s: %s", scan_id, e)
            return None
    
    async def get_user_transaction_count(self, user_id: str) -> int:
        """Get total number of transactions for a user."""
        try:
            collection = await self._get_collection()
            
            # Convert string ID to ObjectId
            object_id = ObjectId(user_id)
            
            # Count transactions for user
            count = await collection.count_documents({"user_id": object_id})
            
            logger.debug("User %s has %d transactions", user_id, count)
            return count
            
        except Exception as e:
            logger.error("Failed to get transaction count for user %s: %s", user_id, e)
            return 0
    
    async def get_user_transaction_summary(self, user_id: str) -> dict:
        """Get aggregated transaction statistics for a user."""
        try:
            collection = await self._get_collection()
            
            # Convert string ID to ObjectId
            object_id = ObjectId(user_id)
            
            # Aggregate transaction statistics
            pipeline = [
                {"$match": {"user_id": object_id}},
                {"$group": {
                    "_id": None,
                    "total_transactions": {"$sum": 1},
                    "total_points": {"$sum": "$amount"},
                    "average_points": {"$avg": "$amount"}
                }}
            ]
            
            result = list(await collection.aggregate(pipeline).to_list(length=1))
            
            if result:
                summary = result[0]
                return {
                    "total_transactions": summary["total_transactions"],
                    "total_points": summary["total_points"],
                    "average_points": round(summary["average_points"], 2)
                }
            else:
                return {
                    "total_transactions": 0,
                    "total_points": 0,
                    "average_points": 0
                }
                
        except Exception as e:
            logger.error("Failed to get transaction summary for user %s: %s", user_id, e)
            return {
                "total_transactions": 0,
                "total_points": 0,
                "average_points": 0
            }
