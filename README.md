# Server Monitor

A React + Node.js dashboard that monitors Docker containers on your VPS: CPU, RAM, start time, uptime, and logs. The app itself is containerized and runs via Docker Compose.

## Features

- **Realtime updates** — WebSocket pushes container list, CPU, memory, and uptime ~every 1 second (no polling)
- **Container list** — All running containers on the host
- **CPU & memory** — Live usage and progress bars
- **Started at** — Container start timestamp
- **Uptime** — Elapsed time since start
- **Logs** — View last 500 lines per container in a modal
- **Reconnect** — Auto-reconnect with backoff if the connection drops

## Quick start (Docker Compose)

On a host that runs Docker (e.g. your VPS):

```bash
git clone <repo-url> server-monitor && cd server-monitor
docker compose up -d --build
```

Open **http://localhost:3000** (or your VPS IP:3000). The backend talks to the host Docker daemon via the mounted socket.

## Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Runs on port 4000. Requires access to `/var/run/docker.sock` (run on the host or mount the socket).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on port 3000 and proxies `/api` to the backend.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/containers` | List running containers |
| GET | `/api/containers/:id` | Container details (startedAt, uptime) |
| GET | `/api/containers/:id/stats` | CPU and memory stats |
| GET | `/api/containers/:id/logs?tail=200` | Container logs |
| GET | `/api/health` | Health check |
| WS | `/ws` | Realtime stream: `{ type, list?, details?, stats?, error? }` every ~1s |

## Stack

- **Frontend:** React 18, Vite
- **Backend:** Node.js, Express, [Dockerode](https://github.com/apocas/dockerode)
- **Deploy:** Docker + Docker Compose (frontend: nginx, backend: Node with Docker socket mounted)
