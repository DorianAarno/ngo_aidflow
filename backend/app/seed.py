import json
import logging
from datetime import datetime, timezone

from .config import settings
from .database import get_db

logger = logging.getLogger(__name__)


def _parse_datetime(raw: str | None) -> datetime | None:
    if not raw:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            pass
    return None


async def seed_complaints() -> None:
    db = get_db()
    count = await db.complaints.count_documents({})
    if count > 0:
        logger.info("Complaints collection already has %d documents — skipping seed", count)
        return

    json_path = settings.complaints_json
    if not json_path.exists():
        logger.warning(
            "complaints.json not found at %s — skipping seed (will be empty until file appears)",
            json_path,
        )
        return

    logger.info("Seeding complaints from %s …", json_path)
    try:
        with open(json_path, encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception as exc:
        logger.error("Failed to read complaints.json: %s — skipping seed", exc)
        return

    raw_complaints = data.get("complaints", [])
    if not raw_complaints:
        logger.warning("complaints.json has no 'complaints' array — nothing to seed")
        return

    docs = []
    skipped = 0
    for item in raw_complaints:
        lat = item.get("latitude")
        lng = item.get("longitude")
        if not lat or not lng:
            skipped += 1
            continue

        try:
            lat = float(lat)
            lng = float(lng)
        except (TypeError, ValueError):
            skipped += 1
            continue

        doc = {
            "source_id": item.get("id") or item.get("complaintId"),
            "generic_id": item.get("generic_id"),
            "city": item.get("_source_city", "Unknown"),
            "title": item.get("category_name", "Unknown Issue"),
            "category_name": item.get("category_name", ""),
            "location": item.get("location", ""),
            "landmark": item.get("landmark", ""),
            "latitude": lat,
            "longitude": lng,
            "complaint_status": item.get("complaint_status", "Open"),
            "complaint_status_id": item.get("complaint_status_id", 1),
            "complaint_image": item.get("complaint_image") or item.get("complaint_image_l1"),
            "full_name": item.get("full_name", "Citizen"),
            "voted_count": item.get("voted_count", 0),
            "created_at": _parse_datetime(item.get("created_at_raw")) or datetime.now(timezone.utc),
            "source": "swachhata",
        }
        docs.append(doc)

    if not docs:
        logger.warning("No valid complaints to insert (all %d skipped — missing lat/lng)", skipped)
        return

    try:
        result = await db.complaints.insert_many(docs, ordered=False)
        logger.info(
            "Seeded %d complaints (%d skipped for missing lat/lng)",
            len(result.inserted_ids),
            skipped,
        )
    except Exception as exc:
        logger.error("Error inserting complaints: %s", exc)
