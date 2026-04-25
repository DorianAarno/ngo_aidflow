# AidFlow — Community Aid Platform

A full-stack web platform connecting citizens, volunteers, and NGOs to track and resolve sanitation and civic complaints in Indian cities. Complaint data is sourced from the Swachhata government API and stored in MongoDB.

## Features

- **Dashboard** — city-scoped stats, interactive Leaflet map, recent complaint feed
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

# 2. (Optional) extract complaint data first
cd ..
python extract_complaints.py          # produces complaints.json
cd aidflow

# 3. Install Python dependencies
cd backend
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env if MongoDB runs on a non-default host/port

# 5. Start MongoDB (if not already running)
#    macOS:  brew services start mongodb-community
#    Linux:  sudo systemctl start mongod
#    Windows: net start MongoDB

# 6. Run the server
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

## Environment Variables

Configured via `backend/.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `aidflow` | Database name |
| `COMPLAINTS_JSON` | `../complaints.json` | Path to extracted complaints file |

---

## Project Structure

```
aidflow/
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
│   │   └── routes/          # Route handlers
│   │       ├── stats.py
│   │       ├── complaints.py
│   │       ├── volunteers.py
│   │       ├── ngos.py
│   │       └── forum.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── index.html           # Single-page app (Leaflet + vanilla JS)
│   └── static/
│       └── app.js
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
| GET | `/api/complaints/map?city=` | Lightweight marker data for map (≤ 2000) |
| GET | `/api/complaints/{id}` | Single complaint detail |
| POST | `/api/complaints` | Submit a new complaint |
| GET | `/api/volunteers?city=` | List volunteers |
| POST | `/api/volunteers` | Register as volunteer |
| GET | `/api/ngos?city=` | List approved NGOs |
| POST | `/api/ngos` | Register NGO (status: pending) |
| POST | `/api/ngos/{id}/projects` | NGO takes on a complaint |
| PATCH | `/api/projects/{id}` | Update project status |
| GET | `/api/forum?city=&page=` | Forum posts |
| POST | `/api/forum` | Create forum post |
| POST | `/api/forum/{id}/like` | Like a post |

---

## Extracting Complaint Data

The `extract_complaints.py` script (in the parent `swachhata/` directory) fetches complaints from the Swachhata government API across 25 Indian cities:

```bash
cd ..   # swachhata/
python extract_complaints.py --output complaints.json --max-pages 25
```

Requires authentication — run `python swachhata.py verify-otp --mobile <number> --otp <otp>` first.

---

## Development Notes

- The frontend is served directly by FastAPI — no separate dev server needed
- Leaflet (OpenStreetMap tiles) is used for all maps — no API key required
- MongoDB indexes are created automatically on startup
- Forum posts and volunteers are scoped to a city; switch cities via the sidebar dropdown
