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

https://github.com/user-attachments/assets/816e4c99-6270-4a49-b8d6-aa47f9168b7d




## UI samples

<img width="1912" height="906" alt="Loging page" src="https://github.com/user-attachments/assets/5940c822-9f46-4ab4-8efb-dff967da86e6" />

<img width="1916" height="907" alt="dashboard" src="https://github.com/user-attachments/assets/c0b192b3-fcc1-4de4-b8be-690881fe2060" />

<img width="1890" height="910" alt="user list" src="https://github.com/user-attachments/assets/1f89310d-7945-43ff-9cf8-f71ea2ba1df2" />

<img width="1912" height="903" alt="worker list" src="https://github.com/user-attachments/assets/095e4fd3-766a-42e0-b021-bdae6e22db8f" />

<img width="1902" height="905" alt="shifts" src="https://github.com/user-attachments/assets/bb09fb7b-55b2-48a1-822a-a5b1b670db45" />

<img width="1916" height="902" alt="shift details" src="https://github.com/user-attachments/assets/43f437f4-8dd4-4914-aaa1-4bfe74d17989" />





