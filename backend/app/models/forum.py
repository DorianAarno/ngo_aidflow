from pydantic import BaseModel, Field


class ForumPostCreate(BaseModel):
    message: str = Field(..., min_length=2, max_length=1000)
    city: str = Field(..., min_length=2)
    author_name: str = Field(default="Anonymous", max_length=100)
