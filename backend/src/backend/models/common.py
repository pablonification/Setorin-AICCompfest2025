from __future__ import annotations

from bson import ObjectId  # type: ignore
from pydantic import BaseModel, Field, ConfigDict, GetJsonSchemaHandler
from typing import Annotated, Any
from pydantic.json_schema import JsonSchemaValue


def validate_object_id(v: Any) -> ObjectId:
    """Validate and convert to ObjectId."""
    if isinstance(v, ObjectId):
        return v
    if isinstance(v, str) and ObjectId.is_valid(v):
        return ObjectId(v)
    raise ValueError("Invalid ObjectId")


def serialize_object_id(v: ObjectId) -> str:
    """Serialize ObjectId to string."""
    return str(v)


# Create Annotated type for ObjectId
PyObjectId = Annotated[
    ObjectId,
    Field(description="MongoDB ObjectId"),
    Field(serialization_alias="id", validation_alias="_id")
]


class MongoBaseModel(BaseModel):
    """Base model that serializes ObjectId to str for JSON."""

    id: PyObjectId = Field(default_factory=ObjectId)
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        extra='ignore'
    )
    
    @classmethod
    def model_json_schema(
        cls,
        by_alias: bool = True,
        ref_template: str = "#/components/schemas/{model}",
        schema_generator: type[GetJsonSchemaHandler] = GetJsonSchemaHandler,
        mode: str = "validation",
    ) -> JsonSchemaValue:
        """Custom JSON schema generation for ObjectId fields."""
        schema = super().model_json_schema(
            by_alias=by_alias,
            ref_template=ref_template,
            schema_generator=schema_generator,
            mode=mode,
        )
        
        # Convert ObjectId fields to string in schema
        if "properties" in schema:
            for prop_name, prop_schema in schema["properties"].items():
                if prop_name == "id" or prop_name == "_id":
                    prop_schema["type"] = "string"
                    prop_schema["format"] = "objectid"
        
        return schema
