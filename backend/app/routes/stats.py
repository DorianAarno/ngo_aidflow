from fastapi import APIRouter, Query
from ..database import get_db

router = APIRouter(tags=["stats"])


@router.get("/stats")
async def get_stats(city: str = Query(default="Bhopal")):
    db = get_db()

    total_problems = await db.complaints.count_documents({"city": city})
    ongoing_projects = await db.projects.count_documents({"city": city, "status": "ongoing"})
    completed_projects = await db.projects.count_documents({"city": city, "status": "completed"})

    # Get distinct cities from complaints collection
    cities_pipeline = [
        {"$group": {"_id": "$city"}},
        {"$sort": {"_id": 1}},
    ]
    cursor = db.complaints.aggregate(cities_pipeline)
    city_docs = await cursor.to_list(length=None)
    available_cities = [d["_id"] for d in city_docs if d["_id"]]

    return {
        "city": city,
        "total_problems": total_problems,
        "ongoing_projects": ongoing_projects,
        "completed_projects": completed_projects,
        "available_cities": sorted(available_cities),
    }
