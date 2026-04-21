from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class NGOCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    registration_number: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    city: str = Field(..., min_length=2)
    address: str = Field(..., min_length=5)
    focus_areas: list[str] = Field(default_factory=list)
    website: Optional[str] = None
    description: str = Field(..., min_length=10)
