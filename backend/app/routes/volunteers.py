from datetime import datetime, timezone

from fastapi import APIRouter, Query, status

from ..database import get_db
from ..models.volunteer import VolunteerCreate

router = APIRouter(tags=["volunteers"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


@router.get("/volunteers")
async def list_volunteers(
    city: str = Query(default="Bhopal"),
    limit: int = Query(default=50, ge=1, le=200),
):
    db = get_db()
    cursor = db.volunteers.find({"city": city}).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_serialize(d) for d in docs]


@router.post("/volunteers", status_code=status.HTTP_201_CREATED)
async def create_volunteer(body: VolunteerCreate):
    db = get_db()
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)

    result = await db.volunteers.insert_one(doc)
    created = await db.volunteers.find_one({"_id": result.inserted_id})
    return _serialize(created)
