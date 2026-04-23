from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status

from ..database import get_db
from ..models.complaint import ComplaintCreate

router = APIRouter(tags=["complaints"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


@router.get("/complaints")
async def list_complaints(
    city: str = Query(default="Bhopal"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: str = Query(default="all"),
):
    db = get_db()
    query: dict = {"city": city}
    if status != "all":
        # Map status string to complaint_status_id
        status_map = {"pending": 1, "ongoing": 2, "completed": 3}
        status_id = status_map.get(status.lower())
        if status_id:
            query["complaint_status_id"] = status_id
        else:
            # Try matching by complaint_status string
            query["complaint_status"] = {"$regex": status, "$options": "i"}

    total = await db.complaints.count_documents(query)
    skip = (page - 1) * limit
    cursor = db.complaints.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [_serialize(d) for d in docs],
    }


@router.get("/complaints/map")
async def map_complaints(city: str = Query(default="Bhopal")):
    db = get_db()
    query = {"city": city}
    projection = {
        "_id": 1,
        "latitude": 1,
        "longitude": 1,
        "complaint_status_id": 1,
        "title": 1,
        "location": 1,
    }
    cursor = db.complaints.find(query, projection).limit(2000)
    docs = await cursor.to_list(length=2000)

    result = []
    for d in docs:
        result.append(
            {
                "id": str(d["_id"]),
                "lat": d.get("latitude"),
                "lng": d.get("longitude"),
                "status_id": d.get("complaint_status_id", 1),
                "title": d.get("title", ""),
                "location": d.get("location", ""),
            }
        )
    return result


@router.get("/complaints/{complaint_id}")
async def get_complaint(complaint_id: str):
    db = get_db()
    try:
        oid = ObjectId(complaint_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid complaint ID format")

    doc = await db.complaints.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found")
    return _serialize(doc)


@router.post("/complaints", status_code=status.HTTP_201_CREATED)
async def create_complaint(body: ComplaintCreate):
    db = get_db()
    doc = body.model_dump()
    doc["source"] = "user"
    doc["complaint_status_id"] = 1
    doc["complaint_status"] = "Open"
    doc["complaint_image"] = body.complaint_image
    doc["voted_count"] = 0
    doc["category_name"] = body.category
    doc["title"] = body.title
    doc["full_name"] = body.submitter_name
    doc["created_at"] = datetime.now(timezone.utc)

    result = await db.complaints.insert_one(doc)
    created = await db.complaints.find_one({"_id": result.inserted_id})
    return _serialize(created)

