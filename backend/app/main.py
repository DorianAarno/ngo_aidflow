import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .database import connect_db, disconnect_db, is_connected
from .routes import stats, complaints, volunteers, ngos, forum

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
STATIC_DIR = FRONTEND_DIR / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await disconnect_db()


app = FastAPI(
    title="AidFlow API",
    description="NGO community aid platform for civic complaint management",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def ensure_db(request: Request, call_next):
    if not is_connected():
        await connect_db()
    return await call_next(request)


# API routes
app.include_router(stats.router, prefix="/api")
app.include_router(complaints.router, prefix="/api")
app.include_router(volunteers.router, prefix="/api")
app.include_router(ngos.router, prefix="/api")
app.include_router(forum.router, prefix="/api")

# Static files
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
async def serve_frontend():
    index = FRONTEND_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"message": "AidFlow API is running. Frontend not found."}
