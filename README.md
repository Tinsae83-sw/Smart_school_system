# Smart School System

A production-oriented school management platform. This branch (`feat/user-management`) delivers a **real**, self-service account management system backed by a Postgres database with SMTP email delivery — replacing the earlier dummy/mock registration.

## What's included in this branch

### Account lifecycle (Backend)
- `users` now carries an account `status` (`PENDING` / `ACTIVE` / `REJECTED` / `SUSPENDED`) plus:
  - `requested_class_id`, `requested_relationship` — captured at self-service signup
  - `approved_by`, `approved_at` — audit trail for admin decisions
  - `must_reset_password` — flags admin-created accounts that must complete a first-login setup
- Migrations:
  - `20260902010000_account_lifecycle`
  - `20260902020000_first_login_setup`

### Self-service registration
- `POST /api/auth/register` for `STUDENT` / `PARENT` roles (real password rules, confirm-password check).
- New accounts are created `PENDING` and wait for admin approval.
- Public `GET /api/auth/classes` feeds the signup form's class dropdown.

### Admin user management
- Admin sidebar with **Class Management** + **User Management**.
- `/admin/users` tabs:
  - **Approvals** — review self-service signups with an inline form (class dropdown for students, student picker to link parents), Approve / Reject.
  - **Create Account** — admin-created accounts are `ACTIVE`, get a generated password, and are flagged `must_reset_password` (first-login OTP setup).
  - **Link Parent** — associate a parent with a student.
  - **All Accounts** — full user list.
- Endpoints: `GET /approvals`, `PUT /approvals/:id/approve`, `DELETE /approvals/:id/approve`, `POST /users`, `GET /students`, `GET /parents`, `POST /users/link-parent`.

### First-login setup with email OTP
- Admin-created accounts must verify via a short-lived OTP and set their own real password on first login. Self-service registrants set their password at signup (no OTP).
- `POST /api/auth/verify-otp`, `POST /api/auth/setup-password`.
- OTP delivery via real SMTP (nodemailer) when `OTP_DELIVERY=email`, console fallback otherwise.
  - Env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `OTP_EMAIL_FROM`.
- Session vs. one-time-setup tokens: a `setup` token grants **only** the set-password endpoint; all protected routes require a proper `session` token.

### Login UI
- `/login` is a 3-step flow: credentials → OTP → set-password, with role-aware redirect.

## Setup

```bash
cd backend
npm install
# copy backend/.env.example -> backend/.env and fill in DB + SMTP values
node scripts/applyMigrations.js   # apply the migrations
node scripts/seed.js              # seed demo users (password: Password123!)
npm run dev                       # backend on :5000
```

Frontend:

```bash
cd frontend
npm install
npm run dev                       # frontend on :3000
```

Demo logins (all password `Password123!`):
`superadmin@example.com`, `principal@example.com`, `depthead@example.com`, `teacher@example.com`, etc.