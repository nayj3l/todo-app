# Simple Todo App

A minimal todo app with a **Spring Boot** backend, **MySQL** persistence, **JSON file backup**, and a **Vite + React** frontend.

## Features

- List all tasks in a centered card UI
- Click a task to view and edit details (title, description)
- Mark tasks done — completed items appear greyed out with strikethrough
- Every write is saved to `data/backup/tasks.json` **before** syncing to MySQL
- On startup, if MySQL is empty but a JSON backup exists, tasks are restored automatically

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for MySQL)
- Java 17+
- Maven 3.9+
- Node.js 18+

## Quick start

### 1. Start MySQL

```bash
docker compose up -d
```

Wait until the container is healthy (about 10–20 seconds on first run).

MySQL is exposed on **port 3307** (not 3306) to avoid conflicts if you already have MySQL installed locally.

### 2. Start the backend

```bash
cd backend
mvn spring-boot:run
```

API runs at `http://localhost:9090` (8080 is often used by other apps on this machine).

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5174` (5173 is used by another app on this machine).

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/{id}` | Get one task |
| POST | `/api/tasks` | Create task `{ "title": "...", "description": "..." }` |
| PUT | `/api/tasks/{id}` | Update task |
| PATCH | `/api/tasks/{id}/done` | Set done `{ "done": true }` |
| DELETE | `/api/tasks/{id}` | Delete task |

## Backup

JSON snapshots are written to:

```
data/backup/tasks.json
```

Configure the path in `backend/src/main/resources/application.yml`:

```yaml
app:
  backup:
    path: ../data/backup/tasks.json
```

## Project structure

```
todo-app/
├── docker-compose.yml
├── backend/          # Spring Boot REST API
├── frontend/         # Vite + React + Tailwind
└── data/backup/      # Local JSON backup (gitignored)
```

## Stop services

```bash
docker compose down
```

To remove MySQL data volume as well:

```bash
docker compose down -v
```
