# RosterFlow

Care-sector rostering system for managing workers, participants, shifts, and skill-based shift assignments.

## Tech Stack

- **Backend:** NestJS (TypeScript), TypeORM, PostgreSQL
- **Frontend:** Svelte 5, Vite
- **Auth:** Keycloak 
- **API docs:** Swagger / OpenAPI (via `@nestjs/swagger`)
- **Infrastructure:** Docker Compose (PostgreSQL + Keycloak)
- **Testing:** Jest, svelte-check
- **CI:** GitHub Actions

## Prerequisites

- Node.js 20+ and npm
- Docker and Docker Compose

## Project Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd roster-hub
```

### 2. Start infrastructure (PostgreSQL + Keycloak)

```bash
cd infrastructure
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Keycloak on `localhost:8080`, auto-importing the `rosterflow` realm from `infrastructure/keycloak/rosterflow-realm.json`

### 3. Configure Keycloak

The `rosterflow` realm import (`infrastructure/keycloak/rosterflow-realm.json`) already includes the client, roles, and the test users below with passwords set — no manual setup needed for local dev. See [docs/keycloak.md](docs/keycloak.md) for details, or to administer the realm yourself via the Keycloak admin console at `http://localhost:8080/admin` (default credentials: `admin` / `admin_password`, see `infrastructure/docker-compose.yml`).

**Test user logins:**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@rosterflow.com` | `Admin123!` |
| Coordinator | `coordinator@rosterflow.com` | `Coord123!` |
| Worker | `worker1@rosterflow.com` | `Worker123!` |

### 4. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Review `.env` — the defaults match the Docker Compose services, but confirm `DB_*` and `KEYCLOAK_*` values, and set `KEYCLOAK_ADMIN_CLIENT_SECRET` (used server-side to call the Keycloak Admin API for user provisioning).

Run database migrations, then optionally seed demo data:

```bash
npm run migration:run
npm run seed   # optional — seeds demo users, workers, participants, skills and shifts
```

### 5. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

The default `.env` values point at the backend (`http://localhost:3000/api`) and Keycloak (`http://localhost:8080`) — adjust if you changed ports.

## Running the Application

With infrastructure containers running (step 2 above):

1. **Backend** — from `backend/`:
   ```bash
   npm run start:dev
   ```
   API available at `http://localhost:3000/api`, Swagger docs at `http://localhost:3000/api/docs`.

2. **Frontend** — from `frontend/`:
   ```bash
   npm run dev
   ```
   App available at `http://localhost:5173`.

3. Open `http://localhost:5173` and log in via Keycloak using one of the test users from step 3 above (e.g. `admin@rosterflow.com` / `Admin123!`).


## Demo Video


https://github.com/user-attachments/assets/f46cb967-fd40-4d79-9c20-a5ae72eee650



## UI samples

<img width="1912" height="906" alt="Loging page" src="https://github.com/user-attachments/assets/df55d198-4341-40c3-8ad3-646441705495" />

<img width="1916" height="942" alt="dashboard" src="https://github.com/user-attachments/assets/ff044394-b1e3-45ff-851e-58648b104526" />

<img width="1915" height="940" alt="user list" src="https://github.com/user-attachments/assets/bccb6bdc-ae30-455d-b32d-767960561083" />

<img width="1912" height="942" alt="worker list" src="https://github.com/user-attachments/assets/0dcb9095-7ee3-4600-b33d-366e9a593d77" />

<img width="1907" height="940" alt="Participants list" src="https://github.com/user-attachments/assets/bf02e63e-1f4c-4984-8fc2-a9d387089951" />

<img width="1912" height="942" alt="shifts" src="https://github.com/user-attachments/assets/b7e79ac8-6a91-404b-8c83-5ee2d9351f33" />

<img width="1913" height="941" alt="shift details" src="https://github.com/user-attachments/assets/b142f9fc-cfc5-4b3e-984d-dd4f7ef6ef4e" />









