from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query, status

from ..database import get_db
from ..models.forum import ForumPostCreate

router = APIRouter(tags=["forum"])


def _serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


@router.get("/forum")
async def list_forum_posts(
    city: str = Query(default="Bhopal"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    db = get_db()
    query = {"city": city}
    total = await db.forum_posts.count_documents(query)
    skip = (page - 1) * limit
    cursor = (
        db.forum_posts.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": [_serialize(d) for d in docs],
    }


@router.post("/forum", status_code=status.HTTP_201_CREATED)
async def create_forum_post(body: ForumPostCreate):
    db = get_db()
    doc = body.model_dump()
    doc["likes"] = 0
    doc["created_at"] = datetime.now(timezone.utc)

    result = await db.forum_posts.insert_one(doc)
    created = await db.forum_posts.find_one({"_id": result.inserted_id})
    return _serialize(created)


@router.post("/forum/{post_id}/like")
async def like_forum_post(post_id: str):
    db = get_db()

    try:
        oid = ObjectId(post_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid post ID format")

    result = await db.forum_posts.update_one(
        {"_id": oid},
        {"$inc": {"likes": 1}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Post {post_id} not found")

    post = await db.forum_posts.find_one({"_id": oid}, {"likes": 1})
    return {"likes": post.get("likes", 0)}
