from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional, List

from pydantic import Field

from .common import MongoBaseModel, PyObjectId


class EducationalContent(MongoBaseModel):
    """MongoDB model for educational content used by Infoin."""

    # Basic display fields
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    media_url: Optional[str] = Field(None, description="Optional image or video URL")

    # Content and taxonomy
    content: str = Field(..., min_length=1, max_length=20000)
    slug: str = Field(..., min_length=1, max_length=200)
    category: Literal["tutorial", "article"] = "tutorial"
    estimated_read_time: int = Field(5, ge=1, le=120)
    tags: List[str] = Field(default_factory=list)
    is_published: bool = True

    # Legacy/compat type used elsewhere (keep broad set to avoid breaking admin)
    content_type: Literal["tip", "infographic", "article", "tutorial", "guide", "video"] = "article"

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
