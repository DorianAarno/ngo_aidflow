from pydantic import BaseModel, Field
from typing import Optional


class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=5)
    category: str = Field(..., min_length=1)
    location: str = Field(..., min_length=2)
    landmark: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    city: str = Field(..., min_length=2)
    submitter_name: str = Field(..., min_length=1)
    submitter_phone: str = ""
