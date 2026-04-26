<div align="center">

#  AidFlow

### AI-Powered Community Aid Platform for Civic Sanitation Complaints

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deployable-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

**Bridging the gap between citizens, NGOs, and government by turning civic complaints into coordinated community action.**

[Live Demo](#-live-demo) · [Features](#-features) · [Quick Start](#-quick-start) · [API Docs](#-api-reference) · [Architecture](#-architecture)

</div>

---

## Hackathon Context

> **AidFlow** was built to solve one of India's most persistent civic challenges: sanitation and public-health complaints that are filed, forgotten, and never resolved. By combining real government complaint data (Swachhata API), AI-powered triage, and a coordination layer for NGOs and volunteers, AidFlow turns raw civic frustration into measurable community impact.

---

##  The Problem

Every day, millions of sanitation complaints are logged across Indian cities — overflowing sewers, broken water supply, garbage accumulation, collapsed roads. Yet:

- **Citizens** have no visibility into whether their complaint was acted upon.
- **NGOs** lack a centralized tool to discover and adopt unresolved issues.
- **Volunteers** have no easy way to connect with organizations doing ground-level work.
- **Priority is undefined** — a gas leak and a cosmetic crack sit in the same queue.

AidFlow addresses all four gaps in a single, deployable web application.

---

##  Features

| Feature | Description |
|---------|-------------|
|  **Interactive Dashboard** | City-scoped statistics, a live Google Maps heatmap of complaints, and a recent complaint feed — all in one view |
|  **AI Triage (Gemini 2.0 Flash)** | Every complaint is automatically classified as `critical / high / medium / low` and summarized in one sentence using Google Gemini |
|  **Complaint Management** | Browse, filter, and paginate all civic complaints; submit new ones with GPS coordinates and photo evidence |
|  **NGO Portal** | Organizations register, get approved, and formally adopt complaints as active projects with trackable status |
|  **Volunteer Registry** | Citizens sign up as volunteers; NGOs can find and mobilize help for active projects |
|  **Community Forum** | City-scoped discussion board with likes so residents can surface urgent issues and share updates |
|  **Lazy AI Enrichment** | Existing complaints are backfilled with AI priority and summary on first view — no batch job required |
|  **Graceful Degradation** | The platform runs without AI keys (defaults to `medium` priority) and without a Maps key (map simply doesn't load) |

---

##  Demo

> **URL:** _[https://aidflow-black.vercel.app/]_  
> **Test credentials:** No login required — the platform is fully open for the hackathon demo.

25+ Sample cities available out of the box after seeding from the Swachhata API:
`Mumbai · Delhi · Bengaluru · Chennai · Hyderabad · Kolkata · Pune+ more`

---

##  Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser / Client                         │
│         Vanilla JS SPA  ·  Google Maps JS API  ·  Nunito UI     │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / REST
┌───────────────────────────▼─────────────────────────────────────┐
│                     FastAPI  (Python 3.11)                        │
│                                                                   │
│  /api/stats   /api/complaints   /api/ngos   /api/forum           │
│  /api/volunteers   /api/projects   /api/config                   │
│                                                                   │
│        ┌──────────────────────────────────────┐                  │
│        │  Gemini 2.0 Flash (google-genai SDK) │                  │
│        │  • priority classification           │                  │
│        │  • one-sentence AI summary           │                  │
│        └──────────────────────────────────────┘                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Motor (async)
┌───────────────────────────▼─────────────────────────────────────┐
│                       MongoDB  7.0                                │
│   collections: complaints · ngos · volunteers · forum · projects │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow for a new complaint:**

```
Citizen fills form → POST /api/complaints
    → Pydantic validation
    → Gemini 2.0 Flash analyzes title + description + category + location
    → Returns {priority, ai_summary} (8 s timeout, fallback to "medium")
    → Stored in MongoDB with AI fields
    → Appears on map with colour-coded priority marker
```

---

##  Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.11, FastAPI 0.111+, Uvicorn |
| **Database** | MongoDB 7, Motor (async driver) |
| **AI / ML** | Google Gemini 2.0 Flash via `google-genai` SDK |
| **Frontend** | Vanilla JS, HTML5/CSS3, Google Maps JavaScript API |
| **Validation** | Pydantic v2, pydantic-settings |
| **Containerisation** | Docker, Docker Compose |
| **Deployment** | Vercel (serverless), Docker on any VPS |
| **Data Source** | Swachhata government API (India) |

---

##  Quick Start
<details>
  <summary>Click to expand setup instructions</summary>

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| MongoDB | 6.0+ (or use Docker) |
| pip | latest |

### 1 · Clone & enter the project

```bash
git clone https://github.com/DorianAarno/ngo_aidflow.git
cd ngo_aidflow
```

### 2 · Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 3 · Configure environment

```bash
cp .env.example .env
```

Open `.env` and set the three keys (see [Environment Variables](#-environment-variables)).

### 4 · Start MongoDB

```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB
```

### 5 · Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

| URL | Purpose |
|-----|---------|
| http://localhost:8000 | Application UI |
| http://localhost:8000/api/docs | Interactive Swagger docs |
| http://localhost:8000/api/redoc | ReDoc documentation |
</details>

---

##  Docker (recommended)
<details>
  <summary>click to expand Docker setup instructions</summary>

The easiest way to run the full stack — no local MongoDB needed.

```bash
# Build and start both services
docker compose up --build
```

This spins up:
- `api` — FastAPI application on port **8000**
- `mongo` — MongoDB 7 on port **27017** (data persisted in the `mongo_data` volume)

```bash
# Stop containers
docker compose down

# Stop and wipe all data
docker compose down -v
```

> **Note:** The Compose file expects a `complaints.json` seed file at `../complaints.json` (produced by the Swachhata extractor script). Remove that volume mount from `docker-compose.yml` if you don't have the file.

</details>

---

##  Vercel Deployment
<details>
  <summary>click to expand Vercel setup instructions</summary>

The project ships with `vercel.json` and `api/index.py` pre-configured for Vercel's Python serverless runtime.

```bash
# Install Vercel CLI (once)
npm i -g vercel

# Deploy
vercel deploy
```

Set the three environment variables in the Vercel dashboard (**Settings → Environment Variables**) or via CLI:

```bash
vercel env add MONGODB_URL
vercel env add GEMINI_API_KEY
vercel env add GOOGLE_MAPS_API_KEY
```

Then promote to production:

```bash
vercel --prod
```

</details>

---

##  Environment Variables

Create `backend/.env` (copy from `.env.example`):

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | ✅ | MongoDB connection string |
| `DB_NAME` | `aidflow` | ✅ | Database name |
| `GEMINI_API_KEY` | _(empty)_ |  recommended | Google Gemini API key — AI triage is silently skipped if unset; all complaints default to `medium` priority |
| `GOOGLE_MAPS_API_KEY` | _(empty)_ |  recommended | Google Maps JavaScript API key — the interactive map won't load without this |

Get your free keys:
- **Gemini:** https://aistudio.google.com/app/apikey
- **Google Maps:** https://console.cloud.google.com/google/maps-apis

---

##  Project Structure

```
ngo_aidflow/
├── api/
│   └── index.py                  # Vercel serverless entry point
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app, middleware, route mounts, static serving
│   │   ├── config.py             # pydantic-settings — reads from .env
│   │   ├── database.py           # Motor async MongoDB client + auto index creation
│   │   ├── models/               # Pydantic v2 request / response schemas
│   │   │   ├── complaint.py      # ComplaintCreate
│   │   │   ├── volunteer.py      # VolunteerCreate
│   │   │   ├── ngo.py            # NGOCreate
│   │   │   ├── forum.py          # ForumPostCreate
│   │   │   └── project.py        # ProjectCreate / ProjectUpdate
│   │   ├── routes/               # FastAPI route handlers
│   │   │   ├── stats.py          # GET /api/stats
│   │   │   ├── complaints.py     # CRUD /api/complaints
│   │   │   ├── volunteers.py     # CRUD /api/volunteers
│   │   │   ├── ngos.py           # CRUD /api/ngos + /api/projects
│   │   │   └── forum.py          # CRUD /api/forum
│   │   └── services/
│   │       └── gemini.py         # Gemini 2.0 Flash — async analyze_complaint()
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── index.html                # Single-page app shell
│   └── static/
│       └── app.js                # All client-side logic
├── vercel.json                   # Vercel routing config
├── docker-compose.yml
└── README.md
```

---

##  API Reference

All endpoints are prefixed with `/api`. Full interactive documentation is available at `/api/docs` (Swagger UI) and `/api/redoc`.

### Stats

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats?city=` | Dashboard KPIs (total, open, resolved, by category) + list of available cities |

### Complaints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/complaints?city=&page=&status=` | Paginated complaint list with optional status filter |
| `GET` | `/api/complaints/map?city=` | Lightweight marker payload for map (≤ 2,000 records), includes `priority` colour coding |
| `GET` | `/api/complaints/{id}` | Full complaint detail — lazily enriches with AI fields on first access |
| `POST` | `/api/complaints` | Submit a new complaint — Gemini triage runs synchronously before the response |

### Volunteers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/volunteers?city=` | List all registered volunteers for a city |
| `POST` | `/api/volunteers` | Register as a volunteer |

### NGOs & Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ngos?city=` | List approved NGOs in a city |
| `POST` | `/api/ngos` | Register an NGO (initial status: `pending`) |
| `POST` | `/api/ngos/{id}/projects` | NGO adopts a complaint as an active project |
| `PATCH` | `/api/projects/{id}` | Update a project's status (`active → resolved`) |

### Community Forum

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/forum?city=&page=` | Paginated forum posts for a city |
| `POST` | `/api/forum` | Create a new forum post |
| `POST` | `/api/forum/{id}/like` | Toggle like on a post |

### Config

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | Returns the `google_maps_api_key` for frontend consumption |

---

##  AI Triage — How It Works

AidFlow uses **Google Gemini 2.0 Flash** to classify every complaint:

```
Input:  Title · Category · Location · Description

Output: {
  "priority": "critical | high | medium | low",
  "summary":  "<one sentence, ≤ 20 words>"
}
```

**Priority rubric:**

| Level | Examples |
|-------|---------|
| 🔴 `critical` | Fire, road collapse, gas leak — immediate danger to life |
| 🟠 `high` | Sewage overflow, broken water supply, large pothole — serious health/safety risk |
| 🟡 `medium` | Garbage accumulation, broken streetlight, minor road damage |
| 🟢 `low` | Small litter, cosmetic damage — minor inconvenience |

**Resilience:** The call has an 8-second timeout. If the key is missing or the call fails for any reason, the complaint is stored with `priority: medium` and an empty summary — no crash, no data loss.

**Lazy backfill:** Complaints imported from the Swachhata API without AI fields are enriched on their first individual `GET /api/complaints/{id}` request, keeping import fast and enrichment eventual.

---

##  Data Source — Swachhata API

Complaint data is seeded from the **Swachhata Platform** — India's official government portal for sanitation and civic issue reporting. The extractor script produces a `complaints.json` file that the Docker Compose setup mounts into the API container for import on first startup.

---

##  Development Notes

- The frontend is served directly by FastAPI — no Node.js dev server or build step is required.
- Google Maps API is loaded dynamically via `/api/config`, so the key is never exposed in source code.
- MongoDB indexes (on `city`, `status`, `created_at`) are created automatically on server startup.
- Forum posts, volunteers, and complaints are always scoped to a city; switch cities via the sidebar dropdown.
- CORS is fully open (`allow_origins=["*"]`) — restrict this before going to production.

---

##  License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">

©AarnoDorian(Arnav Mittal), ritikaslaptop(Ritika Chaturvedi) & Rbnry25(Robin Roy) for Google Solution Challenge-2026
</div>
