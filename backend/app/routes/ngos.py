from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status

from ..database import get_db
from ..models.ngo import NGOCreate
from ..models.project import ProjectCreate, ProjectUpdate

router = APIRouter(tags=["ngos"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


@router.get("/ngos")
async def list_ngos(city: str = Query(default="Bhopal")):
    db = get_db()
    cursor = db.ngos.find({"city": city, "status": "approved"}).sort("name", 1)
    docs = await cursor.to_list(length=None)
    return [_serialize(d) for d in docs]


@router.post("/ngos", status_code=status.HTTP_201_CREATED)
async def create_ngo(body: NGOCreate):
    db = get_db()
    doc = body.model_dump()
    doc["status"] = "pending"
    doc["created_at"] = datetime.now(timezone.utc)

    result = await db.ngos.insert_one(doc)
    created = await db.ngos.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.post("/ngos/{ngo_id}/projects", status_code=status.HTTP_201_CREATED)
async def create_project(ngo_id: str, body: ProjectCreate):
    db = get_db()

    # Validate ngo_id
    try:
        ngo_oid = ObjectId(ngo_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid NGO ID format")

    ngo = await db.ngos.find_one({"_id": ngo_oid})
    if not ngo:
        raise HTTPException(status_code=404, detail=f"NGO {ngo_id} not found")

    doc = body.model_dump()
    doc["ngo_id"] = ngo_id
    doc["status"] = "ongoing"
    doc["created_at"] = datetime.now(timezone.utc)

    result = await db.projects.insert_one(doc)
    created = await db.projects.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.patch("/projects/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate):
    db = get_db()

    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID format")

    result = await db.projects.update_one(
        {"_id": oid},
        {"$set": {"status": body.status, "updated_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Project {project_id} not found")

    updated = await db.projects.find_one({"_id": oid})
    return _serialize(updated)
