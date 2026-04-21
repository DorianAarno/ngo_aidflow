from pydantic import BaseModel, Field
from typing import Literal, Optional


class ProjectCreate(BaseModel):
    complaint_id: str = Field(..., min_length=1)
    ngo_id: str = Field(..., min_length=1)
    city: str = Field(..., min_length=2)
    notes: str = ""


class ProjectUpdate(BaseModel):
    status: Literal["pending", "ongoing", "completed"]
