-- Apply runtime tables and columns required by the Express routers.
-- Created 2026-07-17.

-- ── student_marks: per-student, per-subject mark sheets ─────────────────────
CREATE TABLE "student_marks" (
    "student_marks_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "class_id" INTEGER,
    "subject_id" INTEGER,
    "marks" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "total" DECIMAL(10,2),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_marks_pkey" PRIMARY KEY ("student_marks_id")
);

CREATE INDEX "student_marks_student_id_idx" ON "student_marks"("student_id");
CREATE INDEX "student_marks_class_subject_idx" ON "student_marks"("class_id", "subject_id");

ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "school_classes"("class_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_marks" ADD CONSTRAINT "student_marks_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── book_access_logs: AI-book access tracking ───────────────────────────────
CREATE TABLE "book_access_logs" (
    "access_id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_access_logs_pkey" PRIMARY KEY ("access_id")
);

CREATE INDEX "book_access_logs_student_idx" ON "book_access_logs"("student_id", "accessed_at");
CREATE INDEX "book_access_logs_book_idx" ON "book_access_logs"("book_id");

ALTER TABLE "book_access_logs" ADD CONSTRAINT "book_access_logs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ai_books"("book_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_access_logs" ADD CONSTRAINT "book_access_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── departments: head-of-department directory for governance ────────────────
CREATE TABLE "departments" (
    "department_id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(20),
    "description" TEXT,
    "head_of_department_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("department_id")
);

ALTER TABLE "departments" ADD CONSTRAINT "departments_head_of_department_id_fkey" FOREIGN KEY ("head_of_department_id") REFERENCES "department_heads"("dept_head_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Column additions used by the routers ────────────────────────────────────

ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "teacher_id" INTEGER;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assignments" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
UPDATE "assignments" SET "published_at" = "created_at" WHERE "published_at" IS NULL;

ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "student_id" INTEGER;
UPDATE "grades" SET "student_id" = su."student_id"
  FROM "submissions" su
 WHERE "grades"."student_id" IS NULL AND "grades"."submission_id" = su."submission_id";
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "subject_id" INTEGER;
ALTER TABLE "grades" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMP(3);
UPDATE "grades" SET "published_at" = "graded_at" WHERE "published_at" IS NULL;

ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "type" VARCHAR(50);
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "class_id" INTEGER;
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "format" VARCHAR(10) DEFAULT 'PDF';
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "file_url" TEXT;

-- UNIQUE constraint needed for student reports lookup helper
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "student_id" INTEGER;

-- ── Enumeration extension: EXCUSED attendance ───────────────────────────────

ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'EXCUSED';