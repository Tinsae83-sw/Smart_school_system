# Deliverable 1 — Impact Map

**Course:** SEngb152 — Selected Topics in Software Engineering
**Research title:** T34 — Software Evolution: Impact Analysis of a Major Change
**Category:** Maintenance
**Student:** Yohannes Girma (WU/SE/3036/14D)
**Case system:** Smart School Connect (Smart School System)

---

## 1. The change under analysis

The change studied is a **major schema evolution of the persistence layer** of the Smart School
System: the Prisma data model (`backend/prisma/schema.prisma`, 155 models / 1,854 fields) was
revised — models were renamed, columns renamed, relations added or dropped — while the
hand-written controllers that query those models were **not re-analysed or updated**.

Git evidence:

| Fact | Observation |
|---|---|
| Revision point | Commit `c878334` ("Add parent/principal implementation docs and backend config") |
| What landed together | `schema.prisma`, `ptsaController.js`, `sicController.js`, `seed.js` — all in this single commit |
| Prior schema state | `0a02d6e`, then `606ef0d` (initial) |
| Diff `0a02d6e → c878334` | `PTSAMeeting`, `PTSAFeedback`, `SICPartnershipTracking` etc. appear **as new models** with fields such as `scheduled_date` and `submitted_by_user` |
| Consequence | Controllers were written against a *different* schema revision and were never integrated against the revision that shipped |

The change therefore satisfies the definition of a "major change" for this study: it is
**non-local** (one data model, many consumers), **silent** (plain JavaScript has no compile-time
link to the generated Prisma client), and **already-observed** (it produced real user-visible
failures).

## 2. Why the impact is non-local — the dependency chain

Every field or relation name is a *shared symbol* with more than one consumer. The propagation
path of a single rename is:

```
backend/prisma/schema.prisma          ① source of truth (155 models / 1,854 fields)
        │  prisma generate
        ▼
node_modules/.prisma/client           ② generated, untyped at call sites (JS, not TS)
        │  prisma.<model>.<op>({ ... })
        ▼
backend/src/controllers/*.js          ③ 8 controllers — where names are hard-coded
        │  router.get/post(...)
        ▼
backend/src/routes/*.js               ④ endpoint surface
        │  fetch(`${API_BASE}/...`)
        ▼
frontend/src/app/**/page.tsx          ⑤ 14 role-based dashboards consume JSON shapes
        │
        ▼
backend/seed.js                       ⑥ writes the same models at install time
```

A rename at ① fans out to ③, ⑤ and ⑥. Nothing between ① and ③ checks that the names still
agree: the project is plain JavaScript (no TypeScript, no generated types, no test suite), so
**the coupling is only discovered at runtime, in production, by the end user.**

## 3. Method used to build this map

Manual inspection is unreliable at 1,854 fields, so the map was produced with a static
impact-analysis tool:

**`scripts/impact-analysis/validate_schema_refs.py`**
parses `schema.prisma` to learn the real field/relation names of every model, then walks every
`prisma.<model>.<op>(...)` call in `backend/src` and flags object keys that do not exist on the
model they are queried against.

Calibration of the tool (an impact-analysis result is only as good as its false-positive rate):

| Iteration | Raw findings | Defects removed were false positives caused by… |
|---|---|---|
| v1 | 3,374 | descending into `Json` columns (user data, not Prisma fields); no `groupBy { by }` knowledge |
| v2 | 526 | relation context not switched in nested `include`/`select` |
| v3 | 50 | compound unique keys (`@@unique([a,b])`), `increment`/`decrement` update ops |
| v4 | 40 | line offsets shifted by un-stripped whitespace |
| v5 | 39 | unbalanced bracket depth caused by `[` inside the string `'[GRIEVANCE'`; offset base taken from the `prisma` keyword instead of the argument |
| **Final** | **39** | each remaining finding verified by hand against its schema block |

**39 findings across 8 controller files, all verified as genuine mismatches.** The raw output is
archived in `seminar/evidence/schema-ref-mismatches.txt`, with the exact source line of every
finding in `seminar/evidence/triage-source-lines.txt`.

This calibration sequence is itself a study result: *naive* automated impact analysis reported
3,374 "impacts" for 39 real ones (a 98.8 % false-positive rate), and each reduction step
corresponded to a modelling assumption the tool was missing — which is precisely why
impact analysis requires triage and expert judgement rather than a single grep.

## 4. Impact map

Legend — **Impact type:** `F` functional (call fails at runtime), `D` data (write/read of wrong
or missing column), `I` integration (artefacts never wired together), `T` tooling/verification.
**Status:** FIXED (patched in this study, uncommitted) · OPEN (reproducible, not yet fixed).

### 4.1 Root cause A — field renames not propagated (13 call sites)

| # | Change (old → new symbol) | Affected artefact | Line | Failure mode | Type | Status |
|---|---|---|---|---|---|---|
| A1 | `PTSAMeeting.meeting_date` → `scheduled_date` | `ptsaController.js` | 738 (response key only) | none — cosmetic mapping | — | FIXED |
| A2 | `PTSAFeedback.submitter` → `submitted_by_user` | `ptsaController.js` (feedback include) | — | `PrismaClientValidationError: Unknown field 'submitter'` → PTSA dashboard 500 | F | FIXED |
| A3 | `PTSAMeeting.meeting_date` (query arg) | `ptsaController.js` (meetings) | — | `Unknown argument 'meeting_date'` → PTSA meetings 500 | F | FIXED |
| A4 | `PTSAMeeting.ptsa_meeting_id` → `meeting_id` | `parentController.js` | 4253 | parent meeting-minutes endpoint 500 | F | OPEN |
| A5 | `PTSAAnnouncement.created_at` → `published_at` | `parentController.js` | 3260, 4314 | `orderBy` on unknown field → parent PTSA announcements 500 (2 endpoints) | F | OPEN |
| A6 | `User.password` → `password_hash` | `parentController.js` | 3924 | password-change writes a non-existent column → **account lockout risk** | D | OPEN |
| A7 | `Notification.message`/`read` → `content`/`is_read` | `studentController.js` | 1861, 1863 | notification never created after teacher-evaluation submit | D | OPEN |
| A8 | `SchoolAnnouncement.message` → `content` | `vpAdminController.js` | 1123 | VP announcement creation 500 | D | OPEN |
| A9 | `ComplianceReport.generated_at` → `created_at` | `vpAcademicController.js` | 2651 | compliance report list 500 | F | OPEN |
| A10 | `CourseMaterial.uploaded_by` → `created_by` | `teacherController.js` | 1881 | material upload rejected by Prisma | D | OPEN |
| A11 | `PTSAAnnouncement.created_at` (`orderBy`) | — (same as A5) | — | — | — | — |
| A12 | `StudentPeerEvaluation.evaluation_date` → `submitted_at` | `parentController.js` | 3362 | peer-evaluation list 500 | F | OPEN |
| A13 | `ClassSubject.class` → `school_class` | `parentController.js` | 2139 | parent assignment detail 500 | F | OPEN |
| A14 | `Submission.assessment` → `assignment` | `sicController.js` | 516 | SIC academic-performance query 500 | F | OPEN |

### 4.2 Root cause B — relations queried that do not exist (16 call sites)

These models contain the scalar foreign key (e.g. `teacher_id`, `user_id`) but **no Prisma
relation**, so `include: { user: true }` / `where: { student: … }` is invalid:

| # | Model → missing relation | Affected artefact | Line(s) | Type | Status |
|---|---|---|---|---|---|
| B1 | `ConductGrade.student` | `ptsaController.js` | 322 | F | FIXED* |
| B2 | `ConductGrade.student` (also used in `where`) | `teacherController.js` | 1359 | F | OPEN |
| B3 | `ConductComment.teacher` (include) | `teacherController.js` | 1364 | F | OPEN |
| B4 | `ConductComment.teacher` (nested create) | `teacherController.js` | 1471 | F | OPEN |
| B5 | `Student.enrollments` | `sicController.js` | 506, 513 | F | OPEN |
| B6 | `SICMeetingAttendee.user` | `sicController.js` | 657 | F | OPEN |
| B7 | `StaffPerformance.user` | `principalController.js` | 515 | F | OPEN |
| B8 | `PTSAExecutive.user` | `principalController.js` | 1707 | F | OPEN |
| B9 | `Grievance.user` | `principalController.js` | 1733, 1903 | F | OPEN |
| B10 | `DisciplinaryAction.student` / `recommended_by_user` / `approved_by_user` | `principalController.js` | 1963, 1968, 1969 | F | OPEN |
| B11 | `StaffLeaveRequest.user` | `principalController.js` | 2063 | F | OPEN |
| B12 | `StaffTransfer.user` | `principalController.js` | 2117 | F | OPEN |
| B13 | `SecurityPersonnel.user` | `vpAdminController.js` | 1369 | F | OPEN |
| B14 | `DriverAssignment.driver` | `vpAdminController.js` | 1555 | F | OPEN |

\* B1 is fixed in `ptsaController.js` for the dashboard path verified during this study; the
identical pattern survives in `teacherController.js` (B2), which is direct evidence that **the
fix did not propagate automatically to sibling call sites** — the fan-out problem in miniature.

### 4.3 Root cause C — renamed columns in the transport/inventory domain (9 call sites)

| # | Change (old → new symbol) | Affected artefact | Line(s) | Status |
|---|---|---|---|---|
| C1 | `Vehicle.vehicle_name` → `vehicle_number` | `vpAdminController.js` | 1490, 1517, 1553, 1600 | OPEN |
| C2 | `VehicleMaintenance.scheduled_date` → `service_date` | `vpAdminController.js` | 1520 | OPEN |
| C3 | `TransportSchedule.departure_time` → `start_time` | `vpAdminController.js` | 1603 | OPEN |
| C4 | `FoodInventory.inventory_id` → `food_id`, `quantity` → `current_quantity` | `vpAdminController.js` | 1721, 1722 | OPEN |
| C5 | `SICPartnershipTracking.description` → `impact_assessment` (+ numeric `contribution_value`) | `seed.js` | — | **FIXED** (seeding crashed at line 2048) |

### 4.4 Root cause D — incomplete integration (change shipped half-wired)

| # | Artefact | Observation | Type | Status |
|---|---|---|---|---|
| D1 | `frontend/src/app/sic-member/settings/page.tsx` | **Suggest Partner** button had no `onClick`; backend route `POST /api/sic/partnerships/suggest` existed and returned 201 but nothing called it | I | FIXED (modal + `suggestPartner()` added) |
| D2 | Same page | **Create Assessment**, **View Tracking Reports** buttons still inert | I | OPEN |
| D3 | `backend/prisma.config.ts` | missing `datasource.url` required by Prisma 7 → client could not connect until patched | T | FIXED |
| D4 | Verification | no automated tests anywhere in the repository; every defect above was discovered either by static analysis or by a user-visible 500 | T | OPEN |

## 5. Affected subsystems (blast radius by user role)

| Role / dashboard | Controller | Findings | Feature status before this study |
|---|---|---|---|
| PTSA Representative | `ptsaController.js` | 3 | **Down** — all 3 dashboard endpoints returned 500 |
| Parent | `parentController.js` | 7 | 6 endpoints latent-failing (announcements, assignments, peer evaluations, password change, meeting minutes) |
| Principal | `principalController.js` | 9 | 8 endpoints latent-failing (staff performance, PTSA executive, grievances ×2, discipline, leave, transfers) |
| Teacher | `teacherController.js` | 4 | conduct list, conduct commenting, material upload failing |
| Student | `studentController.js` | 2 | notification creation on evaluation submit failing |
| SIC Member | `sicController.js` | 4 | academic performance + meetings failing; Suggest Partner dead button |
| VP Academic | `vpAcademicController.js` | 1 | compliance report list failing |
| VP Administration | `vpAdminController.js` | 11 | whole transport / inventory / announcement domain failing |
| Database install | `seed.js` | 1 | **Seed crashed** — fresh installation impossible |
| **Total** | **8 controllers + seed + frontend** | **39** | **9 of 14 role dashboards carry at least one failing endpoint** |

## 6. Summary map (change → impact)

```
           MAJOR CHANGE: schema.prisma revision (commit c878334)
                              │
      ┌───────────┬───────────┼────────────┬──────────────┐
      ▼           ▼           ▼            ▼              ▼
  A. renamed   B. dropped   C. renamed   D. half-     E. tooling
     fields      relations     columns     wired UI      drift
   (13 sites)  (16 sites)   (9 sites)   (2 buttons)   (config, no tests)
      │           │           │            │              │
      └───────────┴─────┬─────┴────────────┴──────────────┘
                        ▼
      8 controllers + seed.js + 2 frontend pages = 39 call-site defects
                        │
        ┌───────────────┼──────────────────┐
        ▼               ▼                  ▼
   HTTP 500 on      Silent data loss   Install/runtime
   role dashboards  (notifications,    failure (seed,
   (9 of 14 roles)  password change)   Prisma config)
                        │
                        ▼
        No test suite ⇒ detected only by end users
        ⇒ impact analysis must be done BEFORE the change
```

## 7. Key findings

1. **Impact is measurable.** A single schema revision produced **39 verified defective call
   sites across 8 controllers, plus 1 seed failure and 2 unintegrated UI controls.**
2. **Fan-out is real but bounded.** One rename (`vehicle_name → vehicle_number`) alone
   propagated to 4 call sites; the `ConductGrade.student` mistake recurred in two different
   controllers — the same defect written twice because nothing enforced the coupling.
3. **Impact crosses layers.** The change reached beyond code: database seeding (`seed.js`),
   runtime configuration (`prisma.config.ts`) and the frontend (dead button) were all affected.
4. **Impact was invisible until execution.** Because the client is generated and the code is
   untyped JavaScript, no editor, compiler or linter reported any of the 39 defects.
5. **Detection risk dominates.** With no test suite, the observed failure mode was a generic
   `500 { error: "Failed to …" }`, which neither identifies the schema mismatch nor the change
   that caused it — a textbook case for performing impact analysis *before* merging the change.
