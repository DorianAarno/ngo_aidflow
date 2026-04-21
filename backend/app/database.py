import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from .config import settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    global _client, _db
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(
        settings.mongodb_url,
        serverSelectionTimeoutMS=5000,
    )
    _db = _client[settings.db_name]
    # Ping to verify connection
    await _db.command("ping")
    logger.info("Connected to MongoDB — database: %s", settings.db_name)
    await _create_indexes()


async def disconnect_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        logger.info("Disconnected from MongoDB")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized — call connect_db() first")
    return _db


async def _create_indexes() -> None:
    db = get_db()

    # complaints
    await db.complaints.create_index("city")
    await db.complaints.create_index(
        "source_id",
        unique=True,
        sparse=True,
        name="complaints_source_id_unique_sparse",
    )
    await db.complaints.create_index("complaint_status_id")

    # forum_posts
    await db.forum_posts.create_index(
        [("city", 1), ("created_at", -1)],
        name="forum_posts_city_created_at",
    )

    # projects
    await db.projects.create_index(
        [("city", 1), ("status", 1)],
        name="projects_city_status",
    )

    # volunteers
    await db.volunteers.create_index("city")

    # ngos
    await db.ngos.create_index("city")

    logger.info("MongoDB indexes ensured")
