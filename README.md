# Learn Code Fast · MVP

Minimal monorepo to bootstrap a self-hosted code-learning platform. The stack includes FastAPI + Celery/Redis + PostgreSQL for the backend and Next.js + Tailwind + Monaco for the frontend. The app targets Azure AI Foundry via an OpenAI-compatible endpoint.

## Contents
- **backend**: FastAPI API, Celery worker, PostgreSQL connection.
- **frontend**: Next.js (TypeScript) + Tailwind + Monaco Editor (npm as package manager).
- **infrastructure**: Dockerfiles and `docker-compose` for all services (PostgreSQL, Redis included).

## Prerequisites
- Docker and Docker Compose
- Copy `.env.example` to `.env` and set at least your Azure secrets:
  ```bash
  cp .env.example .env
  ```
  Update `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and `AZURE_OPENAI_DEPLOYMENT`. The public API URL (`NEXT_PUBLIC_API_BASE_URL`) defaults to `http://localhost:8000`.
  For local frontend development outside Docker, install dependencies with `npm install` and run `npm run dev`.

## Quick start
1. Build and launch all containers:
   ```bash
   docker compose up --build
   ```
2. Open the frontend: http://localhost:3000
3. Check the API health: http://localhost:8000/health
4. Try a Celery job:
   ```bash
   curl -X POST "http://localhost:8000/jobs/echo" -d '"ping"' -H "Content-Type: application/json"
   ```

## Structure
```
apps/
  backend/
    app/            # FastAPI + Celery code
    Dockerfile
    requirements.txt
  frontend/
    app/            # Next.js (App Router)
    Dockerfile
    package.json
```

## Notes
- Defaults are tuned for local development. Adjust variables in `.env` for production (database host, Redis URL, domain, etc.).
- The frontend is ready to call the backend and embed Monaco for code evaluation or Azure prompt testing.
