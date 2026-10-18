# Smart School Connect — Full Project Specification

> Goal of this document: give another developer everything they need to **recreate this project from scratch** — the concept, the workflow, the data model, the tools, and how all the pieces fit together.

---

## 1. Concept

**Smart School Connect** (also called *Smart School System*) is a full school-management platform delivered as a web application. A single system serves every stakeholder of a school with a role-specific dashboard:

- Students see their grades, assignments, attendance, conduct, messages and learning tools.
- Teachers manage classes, attendance, assignments, grading, materials, exams, conduct and lesson plans.
- Parents monitor their children's progress, messages, fees and make payments.
- Department heads manage their subject area: teachers, lesson plans, exams, resources, evaluations.
- Principal oversees staff, departments, finances, governance, communications and reports.
- VP Academic runs the curriculum side: classes, courses, timetables, exams, attendance, analytics.
- VP Administration runs operations: assets, facilities, inventory, catering, transport, security, finance, audit.
- PTSA representatives and SIC (School Improvement Committee) members get oversight dashboards.
- Super Admin / Admin manage users, approvals, classes and subjects.

All of this is built on **one shared authentication system with 11 roles**, one PostgreSQL database, one REST API, and one Next.js frontend where each role gets its own route tree and sidebar.

Built specifically for an **Ethiopian school context**: Ethiopian National ID (Fayda) verification, Birr-denominated payments (Chapa/Telebirr), grades 9–12 with the Ethiopian curriculum subject list.

---

## 2. Tech Stack & Tools

| Layer | Technology | Notes |
|---|---|---|
| Backend runtime | **Node.js ≥ 20**, **Express 5** | CommonJS (`"type": "commonjs"`) |
| Database driver | **pg** (node-postgres) with a `Pool` | Pool in `src/config/db.js` |
| Migrations | **Prisma migration files, applied by a custom Node runner** (`node scripts/applyMigrations.js`) — NOT Prisma Client | SQL lives in `backend/prisma/migrations/*/migration.sql`; a `_migrations` table tracks applied ones |
| Auth | **JWT** (`jsonwebtoken`), bcrypt (**bcryptjs**), persisted sessions in `user_sessions` table | Short-lived "setup" tokens vs "session" tokens |
| OTP / email | **nodemailer** + SMTP (Brevo in prod); console fallback in dev | 6-digit codes, 10-min TTL, in `otp_verifications` table |
| Validation | **zod** (used in chat/notifications paths) | |
| File uploads | **multer** + `@aws-sdk/client-s3` | Local disk fallback (`backend/uploads`) or any S3-compatible service |
| Security middleware | **helmet**, **cors**, **express-rate-limit** | Health route sits before the limiter; dev 2000 / prod 4000 req per 15 min per IP |
| Testing lint | npm `test` (node --test), `eslint` | Minimal test suite |
| AI assistant (backend) | **Groq** (default, `llama-3.3-70b-versatile`) or **Ollama** local | SSE streamed chat, role-aware system prompt built from DB context |
| Frontend | **Next.js 15** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4** | `next dev --turbopack`; `output: "standalone"`; icons = inline SVGs + `lucide-react` |
| Local database | **PostgreSQL 15** via **docker-compose** (port 5433, container `smart_school_db`) | Only DB runs in Docker locally |
| Deployment | **Vercel** (frontend), **Render** (backend via Dockerfile + `render.yaml`, managed Postgres) | `vercel.json` overrides build/install commands |

---

## 3. Repository Layout

```
Smart_school_system/
├── README.md                  project docs + setup + demo accounts
├── docker-compose.yml         local Postgres 15 (dev only)
├── render.yaml                Render blueprint (backend + DB, free tier)
├── WHERE_WE_ARE.txt           status/notes doc (uncommitted)
├── backend/
│   ├── package.json
│   ├── Dockerfile             Node 20 Alpine, runs migrations then server
│   ├── .env.example           committed template (real .env is gitignored)
│   ├── prisma/migrations/     14 migrations (SQL), applied by applyMigrations.js
│   ├── scripts/
│   │   ├── applyMigrations.js migration runner
│   │   ├── db.js              DB helpers / reset script
│   │   └── seed.js            demo accounts (password Password123!)
│   └── src/
│       ├── server.js          Express entry, middleware, route mounts
│       ├── config/
│       │   ├── db.js          pg Pool + ping()
│       │   └── assistantKnowledge.js  static Q&A bank for the AI assistant
│       ├── middleware/auth.js authenticate + authorize + role extension loader
│       ├── routes/            (see §6)
│       ├── routes/governance/ shared helpers used by school-governance routes
│       └── utils/             token, password, otp, audit, nationalId, fayda,
│                              storage, llm, assistant
└── frontend/
    ├── package.json
    ├── next.config.ts         standalone output; ignores lint/TS at build
    ├── vercel.json            build + install commands
    ├── .env.example           NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_SITE_URL, GA4 id
    ├── src/middleware.ts      force HTTPS on non-localhost only (no auth)
    └── src/
        ├── lib/auth.ts        role → token key/dashboard path mapping + storage
        ├── lib/api.ts         HTTP client (API_BASE, Bearer, createRoleApi)
        ├── components/        AssistantWidget, Analytics, CookieConsent
        └── app/               125 page.tsx, 12 layout.tsx (see §7)
```

---

## 4. Data Model

### 4.1 Role system (the heart)

`users.role` is a Postgres enum `"UserRole"`:

`SUPER_ADMIN, ADMIN, PRINCIPAL, VP_ACADEMIC, VP_ADMINISTRATION, DEPARTMENT_HEAD, TEACHER, STUDENT, PARENT, PTSA_REPRESENTATIVE, SIC_MEMBER, NON_ACADEMIC_STAFF`

Each role has an **extension table** holding role-specific columns, keyed by `user_id`. The auth middleware loads it automatically onto `req.ext`:

| Role | Extension table | Columns loaded |
|---|---|---|
| TEACHER | teachers | teacher_id, employee_id, department |
| STUDENT | students | student_id, student_number, current_class_id, enrollment_date |
| PARENT | parents | parent_id, relationship |
| PRINCIPAL | principals | principal_id, employee_id |
| VP_ACADEMIC | vp_academic | vp_academic_id, employee_id |
| VP_ADMINISTRATION | vp_administration | vp_admin_id, employee_id |
| DEPARTMENT_HEAD | department_heads | dept_head_id, employee_id, department |
| PTSA_REPRESENTATIVE | ptsa_representatives | ptsa_rep_id, position |
| SIC_MEMBER | sic_members | sic_member_id, role |
| ADMIN / SUPER_ADMIN | administrators | admin_id, employee_id, access_level |

### 4.2 Account lifecycle status

`users.status` is a `"AccountStatus"` enum: `PENDING → ACTIVE → REJECTED | SUSPENDED`.

- **PENDING** = created via self-service signup; **cannot log in** (login returns 403 "still waiting for school approval").
- **ACTIVE** = approved by admin OR created directly by admin.
- **REJECTED / SUSPENDED** = blocked (login returns 403 with a specific message).

Other user flags: `is_active` (bool), `must_reset_password` (bool — forces OTP + password setup on first login), `national_id` (unique, Fayda FIN), `fan`, `fayda_sub`, `fayda_verified_at`, `fayda_birthdate`, `fayda_gender`, `preferred_language`, `profile_picture_url`.

### 4.3 Key tables (grouped)

**Identity & security**: `users`, `user_sessions`, `otp_verifications`, `audit_logs`, `notifications`.

**Academic structure**: `school_classes` (class_name, academic_year, homeroom_teacher_id), `subjects` (subject_name, subject_code), `class_subject` (class_id + subject_id + teacher_id = the teacher who teaches that subject in that class).

**People**: `students` (student_number, current_class_id, dob, gender), `teachers` (employee_id, department, degree_level enum, experience_years, gender enum, grade_levels array, subjects array, hire_date), `parents` (relationship, address), `administrators`, `principals`, `vp_academic`, `vp_administration`, `department_heads`, `ptsa_representatives`, `sic_members`, `non_academic_staff` (role, department, salary).
`student_parent` links students to guardians (a parent may have several children).

**Academics / workflow data**:
- `assignments` — per `class_subject_id`; supports resubmission (allow_resubmission, max_resubmissions, resubmission_deadline).
- `submissions` — per assignment/student, with parent_submission_id for resubmissions.
- `grades` — per submission (score, letter_grade, graded_by), plus student_id/subject_id denormalized.
- `exams` — per `class_subject_id`, exam_type, date, duration, total_marks, `created_by`, `approved_by`, status DRAFT→APPROVED. `exam_results` (per exam+student), `exam_invigilators`.
- `attendance_records` — student_id, class_id, date, status enum (PRESENT/ABSENT/LATE/EXCUSED), recorded_by (teacher user id).
- `lesson_plans` — teacher_id, class_subject_id, objectives/materials/activities (arrays), term, week_number, status PENDING→reviewed.
- `class_schedules` — per class: day_of_week, period, subject, teacher, room, start/end time (the timetable).
- `conduct_grades`, `conduct_incidents`, `student_marks` (jsonb per-student-per-subject mark sheet).

**School governance & admin (VP Admin)**: `departments` (name, code, head_of_department_id), `facilities`, `facility_bookings`, `asset_inventory` (unit_cost, condition, status, assigned_to), `asset_assignments`, `asset_maintenance`, `inventory` + `inventory_transactions`, `suppliers`, `meal_plans` (jsonb menu_items), `food_inventory` + `food_transactions`, `budgets` (total/allocated/spent/remaining + breakdown jsonb), `expenditures`, `income_transactions`, `resource_requests`, `resources` (file_url + storage for study material uploads), `resource_allocations`, `school_fees`, `payments` (status enum PENDING/COMPLETED/FAILED/REFUNDED).

**PTSA / SIC / Principal**: `ptsa_meetings`, `ptsa_announcements`, `ptsa_feedback`, `ptsa_fund_transactions`, `sic_meetings`, `sic_recommendations`, `sic_inspection_reports`, `school_improvement_plans` (SIP), `grievances`, `disciplinary_actions`, `incidents`, `academic_policies`, `academic_calendar`, `school_settings`, `school_events`, `announcements`, `school_announcements` (PENDING→APPROVED).

**Miscellaneous**: `evaluation_links` + `student_evaluations` (created on module load with `CREATE TABLE IF NOT EXISTS`), `peer_evaluation_forms`, `transcripts`, `reports`, `dashboards`, `ai_books`/e-book tables, `transport_schedules`/`vehicles`, `cctv_cameras`, `visitor_logs`, `safety_equipment`.

### 4.4 Enums

- `UserRole`, `AccountStatus` (PENDING/ACTIVE/REJECTED/SUSPENDED)
- `AttendanceStatus` (PRESENT/ABSENT/LATE/EXCUSED)
- `NotificationType` (ASSIGNMENT/ATTENDANCE/GRADE/SYSTEM/MESSAGE/PAYMENT)
- `PaymentStatus` (PENDING/COMPLETED/FAILED/REFUNDED)
- `Gender` (MALE/FEMALE/OTHER), `DegreeLevel` (BACHELOR/MASTER/PHD/DIPLOMA/OTHER)
- `AdminLevel` (SUPER/SCHOOL/DEPARTMENT), `RiskLevel` (LOW/MEDIUM/HIGH)

---

## 5. Authentication & Account Lifecycle (the workflow that ties everything together)

All endpoints live under `/api/auth` (`backend/src/routes/auth.js`).

### 5.1 Self-service registration (STUDENT / PARENT)
1. `POST /register` — frontend posts full_name, email, phone, role (STUDENT or PARENT), and for students a `class_id`.
   - Student accounts are created **PENDING** with `must_reset_password` **false** (they wait for approval).
   - Optional **Fayda ID** verification: the register form may call `/fayda/authorize` (popup flow; returns a result via `postMessage` with key `FAYDA_RESULT`). If the user verified, the FIN/FAN gets saved. Validation against FIN (12 digits, Luhn) and FAN (16 digits) lives in `utils/nationalId.js`.
   - Includes a honeypot field and role must be valid. Email uniqueness enforced.
2. Admin sees the request on **Super Admin → /admin/users → Approvals tab**, which lists all PENDING users (with dropdowns: class picker for students, student picker for linking parents).
3. `DELETE /approvals/:userId/approve` (used as "reject") deletes the request. `PUT /approvals/:userId/approve` approves:
   - sets `status = ACTIVE`
   - if a parent was approved, links them to the chosen student in `student_parent`
   - for students, sets `current_class_id`
   - **audit log** row written.

### 5.2 Admin-created accounts
- `POST /users` (admin) creates a user immediately **ACTIVE**, with:
  - either a chosen password or OTP first-login flow. If the admin sets `must_reset_password` (default true for admin-created accounts), the user gets a generated/temp password and `must_reset_password = true`.
- `POST /users/:id/reset-password` — regenerates a temp password and re-arms OTP-first-login.

### 5.3 Login flow — 3-step for "must reset" users
1. `POST /login` (email + password):
   - validates credentials via bcrypt
   - blocks PENDING/REJECTED/SUSPENDED or inactive accounts
   - if `must_reset_password` → issues an OTP (`issueOtp`) and returns `{ requiresOtp: true }` — **no session token yet**
   - normal users → `createSession` → returns `{ token, user }`, sets `last_login`, writes audit `LOGIN`.
2. `POST /send-otp` / `POST /verify-otp` — the user enters the 6-digit code emailed to them (or printed to the backend console when `OTP_DELIVERY=console`). Verified codes are marked `is_verified = TRUE`; codes expire in 10 minutes.
3. `POST /setup-password` — accepts a short-lived **"setup" JWT** (type `"setup"`, not `"session"`) + new password; updates `password_hash`, sets `must_reset_password = false`. After this, normal login works.

Token mechanics (`utils/token.js`): JWT payload `{ user_id, role, type }` where `type` is `"session"` or `"setup"`. Sessions are stored (and invalidated) in the DB: the auth middleware checks `user_sessions` for the token AND `is_active`, then loads the user + role extension. `POST /logout` deletes the session row.

Other auth endpoints: `GET /me` (profile), `POST /change-password` (authenticated), `GET /classes` (public list for the register form), Fayda endpoints below.

### 5.4 Authorization model (backend)
`middleware/auth.js`:
- `authenticate` — requires `Authorization: Bearer <token>`, verifies JWT (must be `type === "session"`), checks the DB session row still exists, loads `req.user` and `req.ext`, refreshes `last_activity`.
- `authorize(...roles)` — after authenticate, allows the listed roles **or any SUPER_ADMIN** (super admin can access everything). Returns 403 otherwise.
- Routes are role-scoped per mount (e.g. `/api/teacher`, `/api/principal`), with per-endpoint spsic authorizers where needed.

---

## 6. Backend API Surface

All role routers require their own auth. Shared helpers: `governance/common.js` provides generic **profile / change-password / notifications / school-profile / dashboard** endpoints reused across governance routers; `governance/academicShared.js` provides shared exam/course/attendance/analytics logic for VP Academic & department heads.

### `/api/auth` — see §5.

### `/api/admin` (Super Admin / Admin)
Dashboard metrics, user CRUD + status toggle, approvals, link-parent, classes + auto-generate sections (from student-number lists), subjects, class-subject assignment, class schedule (timetable), analytics, audit log, settings, notifications, announcements.

### `/api/teacher` (also mounted at legacy `/n`)
Teacher dashboard, profile, my classes, class roster, attendance (mark present/absent/late/excused + summaries), assignments (create/edit + submissions + resubmissions), grading (grade submissions → grades table, letter grade derivation), study materials (upload → storage), lesson plans, conduct grading, online classes, performance analytics, reports, messages, notifications, activity log, settings, exams.

### `/api/student`
Dashboard, profile, assignments, grades, attendance, conduct + peer evaluations, messages (threaded), notifications, notes/study materials/e-books, learning center, evaluation form by token (`evaluation_links`).

### `/api/parent`
Profile, **children list** (multi-child), per-child dashboard / attendance (+summary) / assignments / grades (+distribution +transcript) / conduct (+peer evaluations) / messages / fees / payments (Chapa/Telebirr ETB), notifications.

### `/api/principal`
Dashboard, departments CRUD, staff (overview, senior management, teachers CRUD), reports, alerts, settings (school settings + academic calendar + policies), communications/announcements, and governance facilities.

### `/api/vp-academic`
Dashboard, teachers, students, classes (+add), courses, timetables (create/generate), exams (create/approve/invigilators), reports, attendance, analytics (grade distribution, teacher/class performance, exam comparison), parent-student relationships.

### `/api/vp-administration`
Dashboard; assets (CRUD, assign, maintenance); facilities + bookings (approve/reject) + maintenance; security (personnel, visitor logs with check-in/check-out, safety equipment, CCTV cameras); catering (meal plans, food inventory, food transactions); finance (budgets, expenditures, income, purchase requests with approve/reject, inventory + transactions, suppliers, non-academic staff + staff attendance + leave requests); discipline (incidents, disciplinary actions); communications (announcements, messages); audit logs; settings (categories, suppliers).

### `/api/department-head`
Departments, dashboard, teachers, lesson plans, exams, resources (+ allocations), evaluations, analytics, reports, students (support), courses, settings.

### `/api/ptsa`
Meetings, announcements, feedback (light surface). PTSA frontend has many pages but the backend is intentionally minimal.

### `/api/sic`
Meetings, recommendations, inspections (light surface).

### `/api/chat` (AI assistant)
`POST /api/chat` — receives role + message history, builds a **role-aware system prompt** (from `utils/assistant.js`: school profile, latest announcements, fees, and the signed-in user's own records depending on role), calls Groq/Ollama (`utils/llm.js`), and **streams the reply back as SSE** (`text/event-stream`, lines prefixed `data:`). Zod-validates input.

### `/api/health`
`GET` — checks `SELECT 1`, returns `{ status, database, timestamp }`. Mounted **before** the rate limiter so monitoring never eats the budget.

---

## 7. Frontend Structure

Next.js App Router, **all pages and layouts are `"use client"`** — data is fetched in `useEffect` client-side. Static pages (terms/privacy) are pure markup.

### 7.1 Route groups (role dashboards + public)

| Group | Pages | Notes |
|---|---|---|
| Public | `/` (landing), `/login`, `/register`, `/chat`, `/contact`, `/privacy-policy`, `/terms`, `not-found` | login = 3-step OTP flow; register = self-service + optional Fayda popup |
| Admin | `/admin/classes`, `/admin/users` | super-admin panel |
| Principal | dashboard, staff-management, departments, settings, financial, governance, communications, reports, grievances | 9 pages |
| VP Academic | dashboard, teachers, students, classes(+add), courses, timetables, exams, reports, attendance, analytics, parent-student-relationships | 12 pages |
| VP Administration | dashboard, assets, facilities, discipline, staff, inventory, reports, catering, transport, communications, finance, audit-logs, security, settings | 14 pages |
| Department Head | dashboard, teachers, lesson-plans, exams, resources, evaluations, analytics, reports, students, courses, settings | 11 pages |
| Teacher | dashboard + classes, lesson-plans, attendance, assignment(s), grade(s), material(s), conduct, online-class(es), performance, report(s), message(s), notification(s), activity-log, setting(s), profile, exams | **27 pages** (many singular/plural duplicates) |
| Student | dashboard, assignments, grades, attendance, conduct, messages, notifications, notes, learning, profile, `evaluation/[token]` (dynamic) | 11 pages |
| Parent | dashboard, grades, attendance, assignments, conduct, messages, notifications, payments, profile | 9 pages; multi-child switch; `mockData.ts` fallback when backend is down |
| PTSA Representative | dashboard + 14 oversight pages | 15 pages |
| SIC Member | dashboard + 7 pages (sip, monitoring, recommendations, meetings, communication, needs-assessment, settings) | 8 pages |

Total: **125 `page.tsx`** and **12 `layout.tsx`**.

### 7.2 Frontend auth (`src/lib/auth.ts`)
- `AUTH_CONFIGS: Record<UserRole, AuthConfig>` maps every role to: `tokenKey`, `userKey`, `loginPath`, `dashboardPath`.
- Tokens stored in **both** `localStorage` and `sessionStorage`; reads prefer localStorage. `setAuth(role, token, user)` clears all roles first, then writes.
- Helpers: `getToken(role)`, `getUser(role)`, `isAuthenticated(role)`, `getAuthenticatedRole()`, `clearAllAuth()`, `getRedirectPath()`.
- **Route protection is client-side**: each role `layout.tsx` is a client component that in `useEffect` checks `isAuthenticated('<ROLE>')` and `router.push("/login")` if not. `middleware.ts` only forces HTTPS on non-localhost — it does not authorize.

### 7.3 HTTP client (`src/lib/api.ts`)
- `API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"`.
- `apiFetch(path, { token, ... })` — injects `Authorization: Bearer`, sets JSON content-type, parses errors, returns JSON.
- `createRoleApi(role, basePath)` factory → `get/post/put/patch/delete/request` bound to the role token. `vpAdminApi` is a prebuilt instance.
- `authFetchFor(role)` — raw fetch wrapper returning `Response` (used by admin pages and teacher's `shared.ts::authFetch`).
- Student/Parent use their context's `doAuthFetch`, which clears all auth + redirects on 401/403.

### 7.4 UI conventions
- Tailwind CSS v4 only — no component library. Cards: `bg-slate-50`, `white rounded-2xl border border-slate-200 shadow-sm`. Buttons: `rounded-xl bg-<color>-600 hover:bg-<color>-700`. Toasts, modal dialogs (`fixed inset-0 z-50 bg-black/40`), mobile slide-in sidebars, spinner loaders.
- Each role has a distinct accent color (admin=indigo, principal=slate/blue, vp-academic=emerald, vp-administration=purple, dept-head=orange, ptsa=teal, sic=rose, teacher=indigo, student=sky, parent=emerald) used for logo, active nav, and loader.
- Two layout families: "big panel" roles use a fixed `w-72` left sidebar with inline-SVG icons and `API_BASE` defined in the layout; teacher/student/parent use a top header + narrow `w-64` sidebar with React contexts (`StudentContext`, `ParentContext`).
- Root layout mounts global widgets: `AssistantWidget` (floating "Ask AI" → `/chat`), `Analytics` (GA4 gated by cookie consent), `CookieConsent`.
- Font: Outfit (`next/font/google`, injected as `--font-outfit`); icons via inline SVG `d` strings and `lucide-react`.

### 7.5 Env vars (frontend)
`NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

---

## 8. AI Assistant (EduConnect)

- Frontend `/chat` page: role-aware (`getAuthenticatedRole()`), sends history to `POST /api/chat`, renders SSE `data:` chunks live.
- Backend `utils/assistant.js` builds the prompt: static `assistantKnowledge.js` Q&A bank + live DB context (school profile, latest 5 announcements, recent fees, and for the signed-in user: student record, teacher record, or parent's children). Queries are wrapped in `safe()` so a failing context lookup never breaks the chat.
- LLM backend (`utils/llm.js`): `LLM_PROVIDER=groq` (default, `GROQ_API_KEY`, model `llama-3.3-70b-versatile`) or `ollama` (local, `OLLAMA_BASE_URL=http://localhost:11434`, model `llama3.1`). Streaming supported.

---

## 9. Fayda (Ethiopian National ID)

- `utils/nationalId.js` — validators for FIN (12 digits, Luhn check) and FAN (16 digits).
- `utils/fayda.js` — OIDC (eSignet) client: builds authorize URL with PKCE (S256), exchanges code at token endpoint, calls userinfo. Config from env: `FAYDA_CLIENT_ID`, `FAYDA_PRIVATE_KEY` (base64 JWK RSA), `FAYDA_REDIRECT_URI`, `FAYDA_AUTHORIZE_URL`, `FAYDA_TOKEN_URL`, `FAYDA_USERINFO_URL`.
- Register page shows the optional FIN/FAN fields and a "Verify with Fayda" button.
- When credentials are empty (and not production), **mock mode**: `GET /fayda/mock` serves a simulated Fayda portal page; the button opens it as a popup, the portal posts a result message (`FAYDA_RESULT`) back to the opener. `FAYDA_MOCK=true|false` forces it on/off.
- Live flow: `POST /fayda/authorize` → redirect URL; `GET /fayda/callback` completes the exchange and returns result to the frontend.
- Verified users store `national_id`, `fan`, `fayda_sub`, `fayda_verified_at`, `fayda_birthdate`, `fayda_gender`.

---

## 10. File Storage

`utils/storage.js`:
- Local: files go in `backend/uploads/` (served at `/uploads` by express.static; configured via `LOCAL_UPLOADS_DIR`).
- S3: any S3-compatible provider (AWS S3, Cloudflare R2, MinIO, DO Spaces) via `@aws-sdk/client-s3`. Env: `S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_FORCE_PATH_STYLE`.
- `resources.file_url` points at either a local `/uploads/...` path (dev) or the object URL (hosted); `resources.storage` records which backend to route through for downloads.

---

## 11. Deployment

### Local
1. `docker compose up -d db` → Postgres 15 on `localhost:5433` (`smart_school` db, `school`/`school`).
2. Backend: `cd backend && npm install`, copy `.env.example` → `.env`, then `npm run db:setup` (migrations) and `npm run db:seed` (demo accounts). Run `npm run dev` (nodemon, port 5000) or `npm start`.
3. Frontend: `cd frontend && npm install`, copy `.env.example` → `.env`, `npm run dev` (Turbopack, port 3000). Production: `npm run build && npm start`.
4. The backend Docker image runs migrations on boot: `node scripts/applyMigrations.js && node src/server.js`.

### Render (`render.yaml`)
- Web service `smart-school-backend`: Docker runtime, health check `/api/health`, env from the blueprint (DATABASE_URL from the managed DB, `DATABASE_SSL=true`, `PORT=10000`, `NODE_ENV=production`, `JWT_SECRET`, `CORS_ORIGINS`, SMTP*, `OTP_DELIVERY=email`). A managed Postgres `smart-school-db` is provisioned on the free tier.

### Vercel (`vercel.json`)
- Frontend: `next build` / `npm install` overrides; `output: "standalone"` in next.config; build ignores TS/lint errors; set `NEXT_PUBLIC_API_BASE` to the Render URL.

Important deployment notes:
- `backend/.env` contains live secrets and is **gitignored**; never commit it.
- `backend/uploads/` is gitignored (runtime files).
- Rate limiter: `/api/health` must stay before the limiter; prod limit is 4000 req/15min/IP. 429 floods have historically come from client-side fetch loops and stale browser tabs running old code — a backend restart resets the in-memory store.

---

## 12. Demo Accounts & Seed

`backend/scripts/seed.js` creates 10 demo users — password for all is **`Password123!`**:

| Role | Email |
|---|---|
| Super Admin | superadmin@example.com |
| Principal | principal@example.com |
| VP Academic | vpacademic@example.com |
| VP Administration | vpadmin@example.com |
| Department Head | depthead@example.com |
| Teacher | teacher@example.com |
| Student | student@example.com |
| Parent | parent@example.com |
| PTSA Representative | ptsa@example.com |
| SIC Member | sic@example.com |

The seed also creates the matching extension rows (administrators, principals, teachers, students, parents, PTSA/SIC), one Grade-10 class, the Mathematics subject, a class_subject assignment, a parent-student link, a school profile ("Smart Valley Academy", Addis Ababa), and a few attendance records. First login prompts OTP (printed to backend console in dev).

---

## 13. Known Caveats (recreate-aware)

1. **Frontend auth is cosmetic** — protection lives in client layouts, not middleware. The backend is the real authority.
2. **Per-role token keys** — one browser tab can hold multiple role tokens; `setAuth` clears the others. Logging into role B logs out role A in that tab.
3. **Two API wrapper styles coexist** (`lib/api` factory vs per-context `doAuthFetch`), and some pages hardcode `NEXT_PUBLIC_API_BASE` again.
4. **Duplicate teacher routes** (singular/plural pairs) — candidates for consolidation.
5. **`evaluation_links` / `student_evaluations`** are created by `CREATE TABLE IF NOT EXISTS` on module load, not a migration file — worth adding a proper migration.
6. Some governance routers (PTSA, SIC) have **minimal backend surface** while the frontend has many pages; several tables are empty and some endpoints return static data.
7. Parent pages have a `mockData.ts` fallback — built/tested before a live backend for all endpoints.
8. The repo's older branches (main, feature/ai-assistant, etc.) are inconsistent; the coherent, bootable state lives on the featured branch (`feat/john`/`feat/user-management` lineage).

---

## 14. How to Recreate (ordered build plan)

1. **Project scaffold** — two folders (`backend`, `frontend`), git repo, docker-compose for Postgres 15 on 5433.
2. **Schema** — write the migrations: enums, users with role/status/must_reset_password/national_id/fayda columns, extension tables per role, then academic + governance + admin tables (see §4). Write `applyMigrations.js` (reads `prisma/migrations/*/migration.sql`, tracks in `_migrations`).
3. **Backend core** — Express server with helmet/cors/json/rate-limit; `/api/health` before the limiter; pg pool; auth middleware (JWT session check + role extension); utils (token, password, otp, audit).
4. **Auth routes** — login, register (PENDING), classes, send/verify-otp, setup-password, logout, me, change-password, Fayda endpoints.
5. **Admin routes + approval flow** — users CRUD, approvals, classes/subjects/class-subject, schedules, audit log.
6. **Role routers** — teacher (largest), student, parent, principal, vp-academic, vp-administration, department-head, ptsa, sic, shared governance helpers.
7. **AI assistant** — chat route (SSE) + prompt builder + Groq/Ollama client.
8. **Frontend shell** — lib/auth + lib/api; root layout with font/GA4/consent/assistant widget; role layouts with sidebars; login (3-step) + register (Fayda popup) + landing.
9. **Role dashboards** — one per role, wired to the role API; duplicate teacher routes not needed.
10. **Storage** — multer + local uploads + S3 path; serve `/uploads` statically.
11. **Deploy** — Render blueprint + backend Dockerfile + Vercel config + env templates.
12. **Seed** — demo users per role + minimal class/subject/class-subject + school profile, password `Password123!`, OTP console fallback.

---

*Generated from the actual codebase (backend Express/Postgres, frontend Next.js). Every section maps to real files under `backend/` and `frontend/`.*