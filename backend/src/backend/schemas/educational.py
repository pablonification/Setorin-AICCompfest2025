from __future__ import annotations

from datetime import datetime
from typing import Optional, Literal, List

from pydantic import BaseModel, Field


class EducationalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    content: str = Field(..., min_length=1, max_length=20000)
    slug: str = Field(..., min_length=1, max_length=200)
    category: Literal["tutorial", "article"] = "tutorial"
    estimated_read_time: int = Field(5, ge=1, le=120)
    tags: List[str] = Field(default_factory=list)
    is_published: bool = True
    content_type: Literal["tip", "infographic", "article", "tutorial", "guide", "video"] = "article"
    media_url: Optional[str] = None


class EducationalCreate(EducationalBase):
    pass


class EducationalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    content: Optional[str] = Field(None, min_length=1, max_length=20000)
    slug: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[Literal["tutorial", "article"]] = None
    estimated_read_time: Optional[int] = Field(None, ge=1, le=120)
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    content_type: Optional[Literal["tip", "infographic", "article", "tutorial", "guide", "video"]] = None
    media_url: Optional[str] = None


class EducationalResponse(EducationalBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "title": "Kenapa botol plastik harus dipipihkan?",
                "description": "Memipihkan botol mengurangi volume sampah hingga 60% dan mencegah air menggenang.",
                "content": "Isi artikel panjang...",
                "slug": "kenapa-botol-plastik-harus-dipipihkan",
                "category": "article",
                "estimated_read_time": 5,
                "tags": ["plastik", "tips"],
                "is_published": True,
                "content_type": "article",
                "media_url": "https://example.com/images/flatten_bottle.jpg",
                "created_at": "2025-08-17T09:00:00Z",
                "updated_at": "2025-08-17T09:00:00Z"
            }
        }


class EducationalListResponse(BaseModel):
    items: list[EducationalResponse]
    total: int
