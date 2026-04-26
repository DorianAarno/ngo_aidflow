# AidFlow — Community Aid Platform

A full-stack web platform connecting citizens, volunteers, and NGOs to track and resolve sanitation and civic complaints in Indian cities. Complaint data is sourced from the Swachhata government API and stored in MongoDB.

## Features

- **Dashboard** — city-scoped stats, interactive Google Maps map, recent complaint feed
- **AI Triage** — Gemini 2.0 Flash automatically classifies every complaint by priority (critical / high / medium / low) and generates a one-sentence summary
- **Complaints** — browse/filter all problems; submit new ones with geolocation
- **NGO Portal** — register your organization, take on complaints as projects
- **Volunteer Registry** — sign up to help NGOs on active problems
- **Community Forum** — city-scoped discussion with likes

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| MongoDB | 6.0+ |
| pip | latest |

---

## Quick Start (local)

```bash
# 1. Clone / enter the project
cd aidflow

# 2. Install Python dependencies
cd backend
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env — set MONGODB_URL, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY

# 4. Start MongoDB (if not already running)
#    macOS:  brew services start mongodb-community
#    Linux:  sudo systemctl start mongod
#    Windows: net start MongoDB

# 5. Run the server
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000** in your browser.  
API docs: **http://localhost:8000/api/docs**

---

## Docker (recommended for deployment)

```bash
# From aidflow/
docker compose up --build
```

This starts:
- `api` — FastAPI app on port **8000**
- `mongo` — MongoDB 7 on port **27017** (data persisted in `mongo_data` volume)

**Stop and remove containers:**
```bash
docker compose down
```

**Remove all data (volumes):**
```bash
docker compose down -v
```

---

## Vercel Deployment

The project is pre-configured for Vercel via `vercel.json` and `api/index.py`.

```bash
vercel deploy
```

Set the environment variables in your Vercel project dashboard (or via `vercel env add`) before deploying to production.

---

## Environment Variables

Configured via `backend/.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `aidflow` | Database name |
| `GEMINI_API_KEY` | _(empty)_ | Google Gemini API key — AI triage is silently skipped if unset |
| `GOOGLE_MAPS_API_KEY` | _(empty)_ | Google Maps JavaScript API key — if unset, map will fail to load |

---

## Project Structure

```
aidflow/
├── api/
│   └── index.py             # Vercel Python entry point
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, lifespan, routes, static serving
│   │   ├── config.py        # pydantic-settings config
│   │   ├── database.py      # Motor async MongoDB client + indexes
│   │   ├── models/          # Pydantic v2 request/response models
│   │   │   ├── complaint.py
│   │   │   ├── volunteer.py
│   │   │   ├── ngo.py
│   │   │   ├── forum.py
│   │   │   └── project.py
│   │   ├── routes/          # Route handlers
│   │   │   ├── stats.py
│   │   │   ├── complaints.py
│   │   │   ├── volunteers.py
│   │   │   ├── ngos.py
│   │   │   └── forum.py
│   │   └── services/
│   │       └── gemini.py    # Gemini 2.0 Flash — priority + summary
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── index.html           # Single-page app (Google Maps + vanilla JS)
│   └── static/
│       └── app.js
├── vercel.json
├── docker-compose.yml
└── README.md
```

---

## API Reference

All endpoints are prefixed with `/api`. Interactive docs at `/api/docs`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stats?city=` | Dashboard stats + available cities |
| GET | `/api/complaints?city=&page=&status=` | Paginated complaints list |
| GET | `/api/complaints/map?city=` | Lightweight marker data for map (≤ 2000), includes `priority` |
| GET | `/api/complaints/{id}` | Single complaint detail — lazily enriched with AI fields on first view |
| POST | `/api/complaints` | Submit a new complaint — AI triage runs synchronously |
| GET | `/api/volunteers?city=` | List volunteers |
| POST | `/api/volunteers` | Register as volunteer |
| GET | `/api/ngos?city=` | List approved NGOs |
| POST | `/api/ngos` | Register NGO (status: pending) |
| POST | `/api/ngos/{id}/projects` | NGO takes on a complaint |
| PATCH | `/api/projects/{id}` | Update project status |
| GET | `/api/forum?city=&page=` | Forum posts |
| POST | `/api/forum` | Create forum post |
| POST | `/api/forum/{id}/like` | Like a post |
| GET | `/api/config` | Exposes `google_maps_api_key` to the frontend |

---

## Development Notes

- The frontend is served directly by FastAPI — no separate dev server needed
- Google Maps JavaScript API is loaded dynamically via `/api/config`; the map degrades gracefully without a key
- AI triage (Gemini) runs on every new complaint submission and lazily backfills existing complaints on first view; if `GEMINI_API_KEY` is not set it defaults to priority `medium` and an empty summary
- MongoDB indexes are created automatically on startup
- Forum posts and volunteers are scoped to a city; switch cities via the sidebar dropdown
