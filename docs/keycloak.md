# Keycloak Setup & Configuration Guide

This document covers the Keycloak Identity Provider (IdP) integration for RosterFlow.

---

## 1. Environment Configuration

The NestJS backend requires the following environment variables (defined in `.env`):

```env
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=rosterflow
KEYCLOAK_CLIENT_ID=rosterflow-backend
```

---

## 2. Keycloak Realm Setup

1. Log in to Keycloak Admin Console (`http://localhost:8080/admin`).
2. Click **Create Realm** in the top-left dropdown menu.
3. Realm Name: `rosterflow`.
4. Click **Create**.

---

## 3. Keycloak Client Setup

1. In the `rosterflow` realm, navigate to **Clients** -> **Create client**.
2. **General Configuration**:
   - Client type: `OpenID Connect`
   - Client ID: `rosterflow-backend`
3. **Capability Config**:
   - Client authentication: `Off` (Public client)
   - Authentication flow: Direct Access Grants, Standard Flow
4. **Login Settings**:
   - Valid Redirect URIs: `http://localhost:5173/*`, `http://localhost:3000/*`
   - Web Origins: `http://localhost:5173`, `http://localhost:3000`, `+`

---

## 4. Roles & Permissions

Create the following **Realm Roles** under **Realm Roles**:

| Role | Description | Access Rights |
| :--- | :--- | :--- |
| `admin` | Administrator | Full access to all system endpoints and worker data |
| `coordinator` | Roster Coordinator | Access to manage shifts, assignments, and rosters |
| `worker` | Support Worker | Restricted access to own profile, availability, and assigned shifts |

> Note: Default Keycloak roles (`offline_access`, `uma_authorization`, `default-roles-rosterflow`) are ignored by the backend RBAC guards.

---

## 5. Test Users

Create test users under **Users** -> **Add user**:

| Username | Email | First Name | Last Name | Realm Role Assigned | Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `admin` | `admin@rosterflow.com` | Admin | User | `admin` | `Admin123!` |
| `coordinator` | `coordinator@rosterflow.com` | Coordinator | User | `coordinator` | `Coord123!` |
| `worker1` | `worker1@rosterflow.com` | Jane | Worker | `worker` | `Worker123!` |

*Set passwords under the **Credentials** tab for each user and set **Temporary** to `OFF`.*

---

## 6. Local Development (Docker Compose)

Start Keycloak locally using Docker:

```bash
docker run -d \
  --name rosterflow-keycloak \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

---

## 7. How to Obtain a Testing Token

To test authenticated backend APIs using `cURL` or Postman, execute a Direct Access Grant token request:

```bash
curl -X POST "http://localhost:8080/realms/rosterflow/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=rosterflow-backend" \
  -d "username=admin@rosterflow.com" \
  -d "password=Admin123!"
```

### Response Example

```json
{
  "access_token": "eyJhbGciOiJSUzI1Ni...",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJIUzI1Ni...",
  "token_type": "Bearer"
}
```

### Making Authenticated Requests

Pass the access token in the `Authorization` header:

```bash
curl -X GET "http://localhost:3000/api/me" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1Ni..."
```
