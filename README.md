# Smart School System

A full school-management platform: attendance, grades, assignments, messaging, reporting, discipline, and more — with role-based dashboards for every stakeholder.

## Tech Stack

- **Backend** — Express.js + PostgreSQL (REST API, JWT auth, OTP setup flow)
- **Frontend** — Next.js 15 / React 19 (role-based dashboards)
- **Database** — PostgreSQL 15 via Docker (optional: any Postgres 14+)
- **Roles** — SUPER_ADMIN, ADMIN, PRINCIPAL, VP_ACADEMIC, VP_ADMINISTRATION, DEPARTMENT_HEAD, TEACHER, STUDENT, PARENT, PTSA_REPRESENTATIVE, SIC_MEMBER

## Prerequisites

- **Node.js 18+** (tested with 20/22)
- **npm**
- **Docker Desktop** (for the local PostgreSQL database)
- ~2 GB free RAM extra (more if you run everything at once)

---

## 1. Clone and install

```bash
git clone https://github.com/Tinsae83-sw/Smart_school_system.git
cd Smart_school_system
```

### Backend

```bash
cd backend
npm install
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

### Frontend

```bash
cd ../frontend
npm install
copy .env.example .env        # Windows
# cp .env.example .env        # macOS / Linux
```

---

## 2. Start the database

From the project root:

```bash
docker compose up -d db
```

This runs PostgreSQL 15 on `localhost:5433` (container `smart_school_db`).
If you prefer your own Postgres, just point `DATABASE_URL` in `backend/.env` at it.

## 3. Prepare the schema and seed data

```bash
cd backend
npm run db:setup     # applies Prisma migrations
npm run db:seed      # creates demo accounts
```

## 4. Run

### Backend (terminal 1)

```bash
cd backend
npm run dev        # nodemon (auto-reload)
# or: npm start    # plain node src/server.js
```

Backend listens on `http://localhost:5000`.

### Frontend (terminal 2)

```bash
cd frontend
npm run dev        # Next.js dev server (Turbopack)
```

Open **http://localhost:3000**.

For a faster production-like experience:

```bash
cd frontend
npm run build
npm start
```

---

## Demo accounts

Every demo account's password is `Password123!` (created by `npm run db:seed`):

| Role              | Email                     |
|-------------------|---------------------------|
| Super Admin       | superadmin@example.com    |
| Principal         | principal@example.com     |
| VP Academic       | vpacademic@example.com    |
| VP Administration | vpadmin@example.com       |
| Department Head   | depthead@example.com      |
| Teacher           | teacher@example.com       |
| Student           | student@example.com       |
| Parent            | parent@example.com        |
| PTSA Representative | ptsa@example.com        |
| SIC Member        | sic@example.com           |

First login prompts for an email OTP — with `OTP_DELIVERY=console` (backend default) the code is printed to the backend terminal.

---

## Fayda (Ethiopian National ID)

Registration works offline with an optional 12-digit FIN / 16-digit FAN field. The "Verify with Fayda" button runs a simulated flow until real partner credentials are set:

```
FAYDA_CLIENT_ID, FAYDA_PRIVATE_KEY, FAYDA_REDIRECT_URI, FAYDA_MOCK
```

Live verification activates automatically when the three credentials above are filled in. See the comments in `backend/.env.example`.

---

## Useful scripts

| Command                     | What it does                              |
|-----------------------------|-------------------------------------------|
| `docker compose up -d db`   | Start PostgreSQL (root dir)               |
| `npm run db:setup`          | Apply migrations (backend)                |
| `npm run db:seed`           | Seed demo accounts (backend)              |
| `npm run db:reset`          | Drop + recreate schema                    |
| `npm run dev`               | backend: nodemon / frontend: Turbopack    |
| `npm run build && npm start`| Frontend production mode                  |