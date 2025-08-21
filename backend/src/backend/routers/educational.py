from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from bson import ObjectId

from ..services.educational_service import EducationalService
from ..schemas.educational import (
    EducationalCreate,
    EducationalResponse,
    EducationalListResponse,
    EducationalUpdate,
)
from .auth import verify_token  # assuming verify_token returns payload dict

router = APIRouter(prefix="/education", tags=["education"])

service = EducationalService()


@router.get("/", response_model=EducationalListResponse)
async def list_contents(limit: int = Query(50, ge=1, le=100), category: str | None = None, published_only: bool = True, q: str | None = None):
    """Public endpoint: list educational contents."""
    filters = {}
    if category:
        filters["category"] = category
    if published_only:
        filters["is_published"] = True
    if q:
        # naive contains filter on title/description
        filters["$or"] = [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    items_raw = await service.list(limit=limit, filters=filters)
    items = []
    for i in items_raw:
        data = i.model_dump(by_alias=False)
        if "_id" in data and "id" not in data:
            data["id"] = str(data.pop("_id"))
        else:
            data["id"] = str(data.get("id"))
        items.append(EducationalResponse.model_validate(data))
    return EducationalListResponse(items=items, total=len(items))


@router.get("/{content_id}", response_model=EducationalResponse)
async def get_content(content_id: str):
    """Public endpoint: get educational content by ID."""
    item = await service.get(content_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    data = item.model_dump(by_alias=False)
    if "_id" in data and "id" not in data:
        data["id"] = str(data.pop("_id"))
    else:
        data["id"] = str(data.get("id"))
    return EducationalResponse.model_validate(data)


@router.get("/slug/{slug}", response_model=EducationalResponse)
async def get_content_by_slug(slug: str):
    """Public endpoint: get educational content by slug."""
    item = await service.get_by_slug(slug)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    data = item.model_dump(by_alias=False)
    if "_id" in data and "id" not in data:
        data["id"] = str(data.pop("_id"))
    else:
        data["id"] = str(data.get("id"))
    return EducationalResponse.model_validate(data)


@router.post("/", response_model=EducationalResponse, status_code=status.HTTP_201_CREATED)
async def create_content(payload: EducationalCreate, token: dict = Depends(verify_token)):
    """Admin endpoint: create educational content."""
    # Simple admin check: assume payload['role'] == 'admin'
    if token.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    item = await service.create(payload.model_dump())
    return item


@router.put("/{content_id}", response_model=EducationalResponse)
async def update_content(content_id: str, payload: EducationalUpdate, token: dict = Depends(verify_token)):
    if token.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    item = await service.update(content_id, {k: v for k, v in payload.model_dump(exclude_none=True).items()})
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
    return item


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(content_id: str, token: dict = Depends(verify_token)):
    if token.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    success = await service.delete(content_id)
    if not success:
        raise HTTPException(status_code=404, detail="Content not found")
    return None
