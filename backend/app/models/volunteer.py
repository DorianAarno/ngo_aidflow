from pydantic import BaseModel, Field, EmailStr
from typing import Optional


class VolunteerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    city: str = Field(..., min_length=2)
    skills: list[str] = Field(default_factory=list)
    availability: str = Field(..., pattern="^(Weekends|Weekdays|Anytime)$")
