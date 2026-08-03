/*
  Warnings:

  - A unique constraint covering the columns `[assignment_id,student_id,resubmission_number]` on the table `submissions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "submissions_assignment_id_student_id_key";

-- AlterTable
ALTER TABLE "assignments" ADD COLUMN     "allow_resubmission" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "max_resubmissions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resubmission_deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN     "feedback_viewed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_submission_id" INTEGER,
ADD COLUMN     "resubmission_number" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "lesson_plans" (
    "lesson_plan_id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "class_subject_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "objectives" TEXT[],
    "materials" TEXT[],
    "activities" TEXT[],
    "assessment" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "review_comments" TEXT,
    "week_number" INTEGER,
    "term" VARCHAR(20) NOT NULL,

    CONSTRAINT "lesson_plans_pkey" PRIMARY KEY ("lesson_plan_id")
);

-- CreateTable
CREATE TABLE "resources" (
    "resource_id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "department" VARCHAR(100) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("resource_id")
);

-- CreateTable
CREATE TABLE "resource_allocations" (
    "allocation_id" SERIAL NOT NULL,
    "resource_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "allocated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returned_at" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "resource_allocations_pkey" PRIMARY KEY ("allocation_id")
);

-- CreateTable
CREATE TABLE "resource_requests" (
    "request_id" SERIAL NOT NULL,
    "resource_id" INTEGER,
    "requested_by" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" INTEGER,
    "review_comments" TEXT,

    CONSTRAINT "resource_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "exams" (
    "exam_id" SERIAL NOT NULL,
    "class_subject_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "exam_type" VARCHAR(50) NOT NULL,
    "exam_date" DATE NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "total_marks" DECIMAL(10,2) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("exam_id")
);

-- CreateTable
CREATE TABLE "exam_invigilators" (
    "invigilator_id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_invigilators_pkey" PRIMARY KEY ("invigilator_id")
);

-- CreateTable
CREATE TABLE "exam_results" (
    "result_id" SERIAL NOT NULL,
    "exam_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "score" DECIMAL(10,2) NOT NULL,
    "letter_grade" CHAR(2),
    "remarks" TEXT,
    "graded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_results_pkey" PRIMARY KEY ("result_id")
);

-- CreateTable
CREATE TABLE "peer_evaluation_forms" (
    "form_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "criteria" JSONB NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "peer_evaluation_forms_pkey" PRIMARY KEY ("form_id")
);

-- CreateTable
CREATE TABLE "peer_evaluations" (
    "evaluation_id" SERIAL NOT NULL,
    "form_id" INTEGER NOT NULL,
    "evaluator_id" INTEGER NOT NULL,
    "evaluatee_id" INTEGER NOT NULL,
    "scores" JSONB NOT NULL,
    "overall_score" DECIMAL(5,2) NOT NULL,
    "comments" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "term" VARCHAR(20) NOT NULL,

    CONSTRAINT "peer_evaluations_pkey" PRIMARY KEY ("evaluation_id")
);

-- CreateTable
CREATE TABLE "department_meetings" (
    "meeting_id" SERIAL NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TIME NOT NULL,
    "location" VARCHAR(100),
    "created_by" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_meetings_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "meeting_attendees" (
    "attendee_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "meeting_attendees_pkey" PRIMARY KEY ("attendee_id")
);

-- CreateTable
CREATE TABLE "meeting_minutes" (
    "minutes_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "action_items" JSONB,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("minutes_id")
);

-- CreateTable
CREATE TABLE "intervention_plans" (
    "intervention_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "actions" TEXT[],
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "progress_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intervention_plans_pkey" PRIMARY KEY ("intervention_id")
);

-- CreateTable
CREATE TABLE "department_settings" (
    "settings_id" SERIAL NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "goals" TEXT[],
    "grading_scale" JSONB,
    "academic_calendar" JSONB,
    "notification_preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_settings_pkey" PRIMARY KEY ("settings_id")
);

-- CreateTable
CREATE TABLE "curriculum_maps" (
    "curriculum_id" SERIAL NOT NULL,
    "subject_id" INTEGER NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "term" VARCHAR(20) NOT NULL,
    "topics" JSONB NOT NULL,
    "learning_objectives" TEXT[],
    "alignment_standards" TEXT[],
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_maps_pkey" PRIMARY KEY ("curriculum_id")
);

-- CreateTable
CREATE TABLE "school_profile" (
    "profile_id" SERIAL NOT NULL,
    "school_name" VARCHAR(200) NOT NULL,
    "address" TEXT NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "logo_url" TEXT,
    "motto" VARCHAR(200),
    "school_code" VARCHAR(20) NOT NULL,
    "woreda" VARCHAR(100) NOT NULL,
    "zone" VARCHAR(100),
    "region" VARCHAR(100) NOT NULL,
    "established_date" DATE,
    "principal_name" VARCHAR(100) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_profile_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "year_id" SERIAL NOT NULL,
    "year_name" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "terms" JSONB NOT NULL,
    "breaks" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("year_id")
);

-- CreateTable
CREATE TABLE "grading_scales" (
    "scale_id" SERIAL NOT NULL,
    "scale_name" VARCHAR(50) NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "min_pass_score" DECIMAL(5,2) NOT NULL,
    "grading_criteria" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grading_scales_pkey" PRIMARY KEY ("scale_id")
);

-- CreateTable
CREATE TABLE "school_fees" (
    "fee_id" SERIAL NOT NULL,
    "fee_name" VARCHAR(100) NOT NULL,
    "fee_type" VARCHAR(50) NOT NULL,
    "grade_level" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "academic_year" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_fees_pkey" PRIMARY KEY ("fee_id")
);

-- CreateTable
CREATE TABLE "academic_policies" (
    "policy_id" SERIAL NOT NULL,
    "policy_name" VARCHAR(200) NOT NULL,
    "policy_type" VARCHAR(50) NOT NULL,
    "content" TEXT NOT NULL,
    "effective_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academic_policies_pkey" PRIMARY KEY ("policy_id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "budget_id" SERIAL NOT NULL,
    "budget_name" VARCHAR(200) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "allocated_amount" DECIMAL(15,2) NOT NULL,
    "spent_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "remaining_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "breakdown" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("budget_id")
);

-- CreateTable
CREATE TABLE "expenditures" (
    "expenditure_id" SERIAL NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "expenditure_date" DATE NOT NULL,
    "approved_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenditures_pkey" PRIMARY KEY ("expenditure_id")
);

-- CreateTable
CREATE TABLE "asset_inventory" (
    "asset_id" SERIAL NOT NULL,
    "asset_name" VARCHAR(200) NOT NULL,
    "asset_code" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cost" DECIMAL(10,2),
    "purchase_date" DATE,
    "location" VARCHAR(100),
    "condition" VARCHAR(20) NOT NULL DEFAULT 'GOOD',
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "assigned_to" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_inventory_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "facility_bookings" (
    "booking_id" SERIAL NOT NULL,
    "facility_id" INTEGER NOT NULL,
    "booking_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "purpose" TEXT NOT NULL,
    "booked_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "school_improvement_plans" (
    "sip_id" SERIAL NOT NULL,
    "plan_name" VARCHAR(200) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "goals" JSONB NOT NULL,
    "action_items" JSONB NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_improvement_plans_pkey" PRIMARY KEY ("sip_id")
);

-- CreateTable
CREATE TABLE "sip_progress" (
    "progress_id" SERIAL NOT NULL,
    "sip_id" INTEGER NOT NULL,
    "action_item_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sip_progress_pkey" PRIMARY KEY ("progress_id")
);

-- CreateTable
CREATE TABLE "sip_feedback" (
    "feedback_id" SERIAL NOT NULL,
    "sip_id" INTEGER NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sip_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "ptsa_executive" (
    "executive_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "position" VARCHAR(50) NOT NULL,
    "term_start" DATE NOT NULL,
    "term_end" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "recognized_by" INTEGER,
    "recognized_at" TIMESTAMP(3),

    CONSTRAINT "ptsa_executive_pkey" PRIMARY KEY ("executive_id")
);

-- CreateTable
CREATE TABLE "ptsa_feedback" (
    "feedback_id" SERIAL NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "feedback" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "responded_by" INTEGER,
    "responded_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptsa_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "budget_advisories" (
    "advisory_id" SERIAL NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "recommendation" TEXT NOT NULL,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_advisories_pkey" PRIMARY KEY ("advisory_id")
);

-- CreateTable
CREATE TABLE "ptsa_meetings" (
    "meeting_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TIME NOT NULL,
    "location" VARCHAR(100),
    "created_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptsa_meetings_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "ptsa_meeting_attendees" (
    "attendee_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "role" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "ptsa_meeting_attendees_pkey" PRIMARY KEY ("attendee_id")
);

-- CreateTable
CREATE TABLE "ptsa_meeting_minutes" (
    "minutes_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "action_items" JSONB,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ptsa_meeting_minutes_pkey" PRIMARY KEY ("minutes_id")
);

-- CreateTable
CREATE TABLE "ptsa_announcements" (
    "announcement_id" SERIAL NOT NULL,
    "meeting_id" INTEGER,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ptsa_announcements_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateTable
CREATE TABLE "ptsa_fund_transactions" (
    "transaction_id" SERIAL NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_url" TEXT,

    CONSTRAINT "ptsa_fund_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "grievances" (
    "grievance_id" SERIAL NOT NULL,
    "submitted_by" INTEGER NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "assigned_to" INTEGER,
    "resolution" TEXT,
    "escalated_to_woreda" BOOLEAN NOT NULL DEFAULT false,
    "escalation_date" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "grievances_pkey" PRIMARY KEY ("grievance_id")
);

-- CreateTable
CREATE TABLE "disciplinary_actions" (
    "action_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "reason" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" TIMESTAMP(3),
    "duration_days" INTEGER,
    "recommended_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disciplinary_actions_pkey" PRIMARY KEY ("action_id")
);

-- CreateTable
CREATE TABLE "staff_leave_requests" (
    "leave_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "staff_id" INTEGER,
    "leave_type" VARCHAR(20) NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_leave_requests_pkey" PRIMARY KEY ("leave_id")
);

-- CreateTable
CREATE TABLE "staff_transfers" (
    "transfer_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "transfer_type" VARCHAR(30) NOT NULL,
    "from_department" VARCHAR(100),
    "to_department" VARCHAR(100),
    "from_school" VARCHAR(100),
    "to_school" VARCHAR(100),
    "effective_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_transfers_pkey" PRIMARY KEY ("transfer_id")
);

-- CreateTable
CREATE TABLE "staff_performance" (
    "performance_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "term" VARCHAR(20) NOT NULL,
    "overall_rating" VARCHAR(10) NOT NULL,
    "metrics" JSONB NOT NULL,
    "strengths" TEXT[],
    "areas_for_improvement" TEXT[],
    "goals" TEXT[],
    "reviewed_by" INTEGER NOT NULL,
    "review_date" DATE NOT NULL,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_performance_pkey" PRIMARY KEY ("performance_id")
);

-- CreateTable
CREATE TABLE "annual_school_reports" (
    "report_id" SERIAL NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "report_data" JSONB NOT NULL,
    "generated_by" INTEGER NOT NULL,
    "submitted_to_woreda" BOOLEAN NOT NULL DEFAULT false,
    "submission_date" TIMESTAMP(3),
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annual_school_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "compliance_reports" (
    "compliance_id" SERIAL NOT NULL,
    "report_name" VARCHAR(200) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "compliance_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLIANT',
    "findings" JSONB NOT NULL,
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" INTEGER,
    "review_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_reports_pkey" PRIMARY KEY ("compliance_id")
);

-- CreateTable
CREATE TABLE "national_exam_reports" (
    "exam_report_id" SERIAL NOT NULL,
    "exam_type" VARCHAR(20) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "total_students" INTEGER NOT NULL,
    "passed_count" INTEGER NOT NULL,
    "pass_rate" DECIMAL(5,2) NOT NULL,
    "average_score" DECIMAL(5,2) NOT NULL,
    "subject_breakdown" JSONB NOT NULL,
    "year_over_year" JSONB NOT NULL,
    "district_comparison" JSONB,
    "generated_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "national_exam_reports_pkey" PRIMARY KEY ("exam_report_id")
);

-- CreateTable
CREATE TABLE "school_announcements" (
    "announcement_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "announcement_type" VARCHAR(30) NOT NULL,
    "target_audience" VARCHAR(50) NOT NULL DEFAULT 'ALL',
    "created_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "publish_date" TIMESTAMP(3),
    "is_urgent" BOOLEAN NOT NULL DEFAULT false,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_announcements_pkey" PRIMARY KEY ("announcement_id")
);

-- CreateTable
CREATE TABLE "urgent_alerts" (
    "alert_id" SERIAL NOT NULL,
    "alert_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(10) NOT NULL DEFAULT 'HIGH',
    "created_by" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "delivery_method" VARCHAR(20) NOT NULL DEFAULT 'SMS_EMAIL',
    "target_audience" VARCHAR(50) NOT NULL DEFAULT 'ALL',
    "status" VARCHAR(20) NOT NULL DEFAULT 'SENT',

    CONSTRAINT "urgent_alerts_pkey" PRIMARY KEY ("alert_id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "log_id" SERIAL NOT NULL,
    "communication_type" VARCHAR(30) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "recipient_count" INTEGER NOT NULL,
    "sent_by" INTEGER NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SENT',
    "details" JSONB,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "school_events" (
    "event_id" SERIAL NOT NULL,
    "event_name" VARCHAR(200) NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "event_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "location" VARCHAR(100),
    "organized_by" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    "attendance_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "school_partnerships" (
    "partnership_id" SERIAL NOT NULL,
    "partner_name" VARCHAR(200) NOT NULL,
    "partner_type" VARCHAR(50) NOT NULL,
    "partnership_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "contact_person" VARCHAR(100),
    "contact_email" VARCHAR(100),
    "contact_phone" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "school_partnerships_pkey" PRIMARY KEY ("partnership_id")
);

-- CreateTable
CREATE TABLE "alumni_contacts" (
    "alumni_id" SERIAL NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(20),
    "graduation_year" INTEGER NOT NULL,
    "current_occupation" VARCHAR(100),
    "current_location" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alumni_contacts_pkey" PRIMARY KEY ("alumni_id")
);

-- CreateTable
CREATE TABLE "community_feedback" (
    "feedback_id" SERIAL NOT NULL,
    "feedback_type" VARCHAR(50) NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "subject" VARCHAR(200) NOT NULL,
    "feedback" TEXT NOT NULL,
    "submitted_anonymously" BOOLEAN NOT NULL DEFAULT false,
    "submitter_name" VARCHAR(100),
    "submitter_contact" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "parent_surveys" (
    "survey_id" SERIAL NOT NULL,
    "survey_name" VARCHAR(200) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "term" VARCHAR(20) NOT NULL,
    "questions" JSONB NOT NULL,
    "target_audience" VARCHAR(50) NOT NULL DEFAULT 'ALL_PARENTS',
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_surveys_pkey" PRIMARY KEY ("survey_id")
);

-- CreateTable
CREATE TABLE "parent_survey_responses" (
    "response_id" SERIAL NOT NULL,
    "survey_id" INTEGER NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_survey_responses_pkey" PRIMARY KEY ("response_id")
);

-- CreateTable
CREATE TABLE "sic_meetings" (
    "meeting_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TIME NOT NULL,
    "location" VARCHAR(100),
    "meeting_type" VARCHAR(20) NOT NULL DEFAULT 'REGULAR',
    "created_by" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_meetings_pkey" PRIMARY KEY ("meeting_id")
);

-- CreateTable
CREATE TABLE "sic_meeting_attendees" (
    "attendee_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "role" VARCHAR(50),
    "notes" TEXT,

    CONSTRAINT "sic_meeting_attendees_pkey" PRIMARY KEY ("attendee_id")
);

-- CreateTable
CREATE TABLE "sic_meeting_minutes" (
    "minutes_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "action_items" JSONB,
    "decisions" JSONB,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_meeting_minutes_pkey" PRIMARY KEY ("minutes_id")
);

-- CreateTable
CREATE TABLE "sic_agenda_items" (
    "agenda_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "submitted_by" INTEGER NOT NULL,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_agenda_items_pkey" PRIMARY KEY ("agenda_id")
);

-- CreateTable
CREATE TABLE "sic_resolutions" (
    "resolution_id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "proposed_by" INTEGER NOT NULL,
    "vote_for" INTEGER NOT NULL DEFAULT 0,
    "vote_against" INTEGER NOT NULL DEFAULT 0,
    "vote_abstain" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
    "passed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_resolutions_pkey" PRIMARY KEY ("resolution_id")
);

-- CreateTable
CREATE TABLE "sic_needs_assessments" (
    "assessment_id" SERIAL NOT NULL,
    "assessment_name" VARCHAR(200) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "assessment_type" VARCHAR(50) NOT NULL,
    "questions" JSONB NOT NULL,
    "target_audience" VARCHAR(50) NOT NULL DEFAULT 'ALL',
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_needs_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "sic_assessment_responses" (
    "response_id" SERIAL NOT NULL,
    "assessment_id" INTEGER NOT NULL,
    "respondent_type" VARCHAR(50) NOT NULL,
    "respondent_id" INTEGER,
    "answers" JSONB NOT NULL,
    "submitted_anonymously" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_assessment_responses_pkey" PRIMARY KEY ("response_id")
);

-- CreateTable
CREATE TABLE "sic_trainings" (
    "training_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "training_type" VARCHAR(50) NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "scheduled_time" TIME NOT NULL,
    "location" VARCHAR(100),
    "duration_hours" INTEGER,
    "instructor" VARCHAR(100),
    "max_participants" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_trainings_pkey" PRIMARY KEY ("training_id")
);

-- CreateTable
CREATE TABLE "sic_training_completions" (
    "completion_id" SERIAL NOT NULL,
    "training_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedback" TEXT,
    "rating" INTEGER,

    CONSTRAINT "sic_training_completions_pkey" PRIMARY KEY ("completion_id")
);

-- CreateTable
CREATE TABLE "sic_annual_reports" (
    "report_id" SERIAL NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "report_data" JSONB NOT NULL,
    "achievements" JSONB,
    "recommendations" JSONB,
    "submitted_by" INTEGER NOT NULL,
    "submitted_to_board" BOOLEAN NOT NULL DEFAULT false,
    "submission_date" TIMESTAMP(3),
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_annual_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateTable
CREATE TABLE "sic_action_logs" (
    "action_log_id" SERIAL NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "action_taken_by" INTEGER NOT NULL,
    "related_sip_id" INTEGER,
    "related_meeting_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sic_action_logs_pkey" PRIMARY KEY ("action_log_id")
);

-- CreateTable
CREATE TABLE "sic_inspection_reports" (
    "inspection_id" SERIAL NOT NULL,
    "inspection_type" VARCHAR(50) NOT NULL,
    "inspection_date" DATE NOT NULL,
    "inspector_name" VARCHAR(100) NOT NULL,
    "inspector_agency" VARCHAR(100) NOT NULL,
    "findings" JSONB NOT NULL,
    "recommendations" JSONB,
    "compliance_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "response_deadline" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "sic_inspection_reports_pkey" PRIMARY KEY ("inspection_id")
);

-- CreateTable
CREATE TABLE "sic_self_assessments" (
    "assessment_id" SERIAL NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "strengths" JSONB NOT NULL,
    "weaknesses" JSONB NOT NULL,
    "opportunities" JSONB NOT NULL,
    "threats" JSONB NOT NULL,
    "priority_areas" JSONB NOT NULL,
    "conducted_by" INTEGER NOT NULL,
    "conducted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "sic_self_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "sic_recommendations" (
    "recommendation_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "submitted_by" INTEGER NOT NULL,
    "submitted_to" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "implemented_at" TIMESTAMP(3),
    "response" TEXT,

    CONSTRAINT "sic_recommendations_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateTable
CREATE TABLE "sic_partnership_tracking" (
    "tracking_id" SERIAL NOT NULL,
    "partnership_id" INTEGER NOT NULL,
    "contribution_type" VARCHAR(50) NOT NULL,
    "contribution_value" DECIMAL(15,2),
    "impact_assessment" TEXT,
    "tracking_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tracked_by" INTEGER NOT NULL,

    CONSTRAINT "sic_partnership_tracking_pkey" PRIMARY KEY ("tracking_id")
);

-- CreateTable
CREATE TABLE "non_academic_staff" (
    "staff_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "department" VARCHAR(100),
    "hire_date" DATE,
    "salary" DECIMAL(10,2),
    "work_schedule" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "non_academic_staff_pkey" PRIMARY KEY ("staff_id")
);

-- CreateTable
CREATE TABLE "staff_attendance" (
    "attendance_id" SERIAL NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "check_in_time" TIME,
    "check_out_time" TIME,
    "notes" TEXT,
    "recorded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "facility_id" SERIAL NOT NULL,
    "facility_name" VARCHAR(200) NOT NULL,
    "facility_type" VARCHAR(50) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "location" VARCHAR(100),
    "building" VARCHAR(50),
    "floor" INTEGER,
    "amenities" TEXT[],
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("facility_id")
);

-- CreateTable
CREATE TABLE "facility_maintenance" (
    "maintenance_id" SERIAL NOT NULL,
    "facility_id" INTEGER NOT NULL,
    "issue_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "reported_by" INTEGER NOT NULL,
    "assigned_to" INTEGER,
    "scheduled_date" DATE,
    "completed_date" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facility_maintenance_pkey" PRIMARY KEY ("maintenance_id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "assignment_id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "assigned_to" VARCHAR(100) NOT NULL,
    "assigned_by" INTEGER NOT NULL,
    "assigned_date" DATE NOT NULL,
    "return_date" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ASSIGNED',
    "condition_on_assign" VARCHAR(20) NOT NULL,
    "condition_on_return" VARCHAR(20),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "asset_maintenance" (
    "maintenance_id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "maintenance_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "completed_date" TIMESTAMP(3),
    "performed_by" VARCHAR(100),
    "cost" DECIMAL(10,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_maintenance_pkey" PRIMARY KEY ("maintenance_id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "supplier_id" SERIAL NOT NULL,
    "supplier_name" VARCHAR(200) NOT NULL,
    "contact_person" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100),
    "phone_number" VARCHAR(20) NOT NULL,
    "address" TEXT,
    "products_services" TEXT[],
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "rating" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("supplier_id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "request_id" SERIAL NOT NULL,
    "request_number" VARCHAR(50) NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "item_description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "category" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "requested_by" INTEGER NOT NULL,
    "supplier_id" INTEGER,
    "justification" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "approved_by" INTEGER,
    "approved_at" TIMESTAMP(3),
    "order_date" TIMESTAMP(3),
    "expected_delivery" TIMESTAMP(3),
    "actual_delivery" TIMESTAMP(3),
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "inventory_id" SERIAL NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "unit_of_measure" VARCHAR(20) NOT NULL,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "max_stock" INTEGER,
    "unit_cost" DECIMAL(10,2),
    "location" VARCHAR(100),
    "supplier_id" INTEGER,
    "last_restocked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("inventory_id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "transaction_id" SERIAL NOT NULL,
    "inventory_id" INTEGER NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remaining_stock" INTEGER NOT NULL,
    "unit_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "reference" VARCHAR(50),
    "performed_by" INTEGER NOT NULL,
    "notes" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "incident_id" SERIAL NOT NULL,
    "incident_type" VARCHAR(50) NOT NULL,
    "reported_by" INTEGER NOT NULL,
    "incident_date" DATE NOT NULL,
    "incident_time" TIME,
    "involved_person_id" INTEGER,
    "involved_person_type" VARCHAR(20),
    "description" TEXT NOT NULL,
    "location" VARCHAR(100),
    "witnesses" TEXT[],
    "priority" VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    "status" VARCHAR(20) NOT NULL DEFAULT 'REPORTED',
    "action_taken" TEXT,
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("incident_id")
);

-- CreateTable
CREATE TABLE "income_transactions" (
    "income_id" SERIAL NOT NULL,
    "budget_id" INTEGER,
    "income_source" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "description" TEXT NOT NULL,
    "income_date" DATE NOT NULL,
    "received_by" INTEGER NOT NULL,
    "reference" VARCHAR(100),
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "income_transactions_pkey" PRIMARY KEY ("income_id")
);

-- CreateTable
CREATE TABLE "security_personnel" (
    "security_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "employee_id" VARCHAR(20) NOT NULL,
    "shift" VARCHAR(20) NOT NULL,
    "patrol_route" TEXT,
    "assigned_area" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_personnel_pkey" PRIMARY KEY ("security_id")
);

-- CreateTable
CREATE TABLE "visitor_logs" (
    "visitor_id" SERIAL NOT NULL,
    "visitor_name" VARCHAR(100) NOT NULL,
    "visitor_type" VARCHAR(50) NOT NULL,
    "purpose" TEXT NOT NULL,
    "person_to_visit" VARCHAR(100) NOT NULL,
    "id_type" VARCHAR(50),
    "id_number" VARCHAR(50),
    "check_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_time" TIMESTAMP(3),
    "phone_number" VARCHAR(20),
    "vehicle_plate" VARCHAR(20),
    "notes" TEXT,
    "logged_by" INTEGER NOT NULL,

    CONSTRAINT "visitor_logs_pkey" PRIMARY KEY ("visitor_id")
);

-- CreateTable
CREATE TABLE "safety_equipment" (
    "equipment_id" SERIAL NOT NULL,
    "equipment_type" VARCHAR(50) NOT NULL,
    "equipment_name" VARCHAR(200) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "facility_id" INTEGER,
    "installation_date" DATE,
    "last_inspection" DATE,
    "next_inspection" DATE,
    "expiry_date" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "safety_equipment_pkey" PRIMARY KEY ("equipment_id")
);

-- CreateTable
CREATE TABLE "cctv_cameras" (
    "camera_id" SERIAL NOT NULL,
    "camera_name" VARCHAR(200) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "facility_id" INTEGER,
    "camera_type" VARCHAR(50) NOT NULL,
    "ip_address" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPERATIONAL',
    "last_checked" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cctv_cameras_pkey" PRIMARY KEY ("camera_id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "vehicle_id" SERIAL NOT NULL,
    "vehicle_number" VARCHAR(20) NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "make" VARCHAR(50),
    "model" VARCHAR(50),
    "year" INTEGER,
    "fuel_type" VARCHAR(20),
    "condition" VARCHAR(20) NOT NULL DEFAULT 'GOOD',
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "purchase_date" DATE,
    "last_service" DATE,
    "next_service" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("vehicle_id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenance" (
    "maintenance_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "maintenance_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "service_date" DATE NOT NULL,
    "odometer_reading" INTEGER,
    "cost" DECIMAL(10,2),
    "performed_by" VARCHAR(100),
    "service_provider" VARCHAR(200),
    "next_service_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_maintenance_pkey" PRIMARY KEY ("maintenance_id")
);

-- CreateTable
CREATE TABLE "driver_assignments" (
    "assignment_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "assigned_date" DATE NOT NULL,
    "shift" VARCHAR(20) NOT NULL,
    "route" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "transport_schedules" (
    "schedule_id" SERIAL NOT NULL,
    "vehicle_id" INTEGER NOT NULL,
    "route_name" VARCHAR(200) NOT NULL,
    "route_description" TEXT,
    "pickup_points" JSONB NOT NULL,
    "dropoff_points" JSONB NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "days_of_week" VARCHAR(10)[],
    "academic_year" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_schedules_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "meal_id" SERIAL NOT NULL,
    "plan_name" VARCHAR(200) NOT NULL,
    "meal_type" VARCHAR(20) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "week_number" INTEGER NOT NULL,
    "day_of_week" VARCHAR(10) NOT NULL,
    "menu_items" JSONB NOT NULL,
    "nutritional_info" JSONB,
    "special_diet" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("meal_id")
);

-- CreateTable
CREATE TABLE "food_inventory" (
    "food_id" SERIAL NOT NULL,
    "item_name" VARCHAR(200) NOT NULL,
    "item_code" VARCHAR(50) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "unit_of_measure" VARCHAR(20) NOT NULL,
    "current_quantity" DECIMAL(10,2) NOT NULL,
    "reorder_level" DECIMAL(10,2) NOT NULL,
    "max_quantity" DECIMAL(10,2),
    "unit_cost" DECIMAL(10,2),
    "storage_location" VARCHAR(100),
    "supplier_id" INTEGER,
    "expiry_date" TIMESTAMP(3),
    "last_restocked" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_inventory_pkey" PRIMARY KEY ("food_id")
);

-- CreateTable
CREATE TABLE "food_transactions" (
    "transaction_id" SERIAL NOT NULL,
    "food_id" INTEGER NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "remaining_quantity" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(10,2),
    "reference" VARCHAR(50),
    "performed_by" INTEGER NOT NULL,
    "meal_date" DATE,
    "notes" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_transactions_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "conduct_grades" (
    "conduct_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "term" VARCHAR(20) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "grade" VARCHAR(20) NOT NULL,
    "rating" DECIMAL(3,2) NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "comments" TEXT,
    "graded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conduct_grades_pkey" PRIMARY KEY ("conduct_id")
);

-- CreateTable
CREATE TABLE "conduct_comments" (
    "comment_id" SERIAL NOT NULL,
    "conduct_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "subject" VARCHAR(100),
    "commented_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conduct_comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "conduct_incidents" (
    "incident_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "incident_date" DATE NOT NULL,
    "incident_type" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,
    "resolution" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'RESOLVED',
    "reported_by" INTEGER NOT NULL,
    "resolved_by" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conduct_incidents_pkey" PRIMARY KEY ("incident_id")
);

-- CreateTable
CREATE TABLE "parent_teacher_conferences" (
    "conference_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "conference_date" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "location" VARCHAR(100),
    "academic_year" VARCHAR(20) NOT NULL,
    "term" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_teacher_conferences_pkey" PRIMARY KEY ("conference_id")
);

-- CreateTable
CREATE TABLE "conference_bookings" (
    "booking_id" SERIAL NOT NULL,
    "conference_id" INTEGER NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conference_bookings_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "parent_notification_preferences" (
    "preference_id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "email_grades" BOOLEAN NOT NULL DEFAULT true,
    "email_attendance" BOOLEAN NOT NULL DEFAULT true,
    "email_conduct" BOOLEAN NOT NULL DEFAULT true,
    "email_assignments" BOOLEAN NOT NULL DEFAULT true,
    "email_announcements" BOOLEAN NOT NULL DEFAULT true,
    "sms_grades" BOOLEAN NOT NULL DEFAULT false,
    "sms_attendance" BOOLEAN NOT NULL DEFAULT false,
    "sms_conduct" BOOLEAN NOT NULL DEFAULT false,
    "sms_assignments" BOOLEAN NOT NULL DEFAULT false,
    "sms_announcements" BOOLEAN NOT NULL DEFAULT false,
    "in_app_grades" BOOLEAN NOT NULL DEFAULT true,
    "in_app_attendance" BOOLEAN NOT NULL DEFAULT true,
    "in_app_conduct" BOOLEAN NOT NULL DEFAULT true,
    "in_app_assignments" BOOLEAN NOT NULL DEFAULT true,
    "in_app_announcements" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parent_notification_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "parent_login_history" (
    "login_id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_time" TIMESTAMP(3),
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "device_type" VARCHAR(50),
    "login_status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',

    CONSTRAINT "parent_login_history_pkey" PRIMARY KEY ("login_id")
);

-- CreateTable
CREATE TABLE "parent_child_association_requests" (
    "request_id" SERIAL NOT NULL,
    "parent_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "relationship" VARCHAR(40) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" INTEGER,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,

    CONSTRAINT "parent_child_association_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "national_exam_results" (
    "result_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "exam_type" VARCHAR(20) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "exam_year" INTEGER NOT NULL,
    "subjects" JSONB NOT NULL,
    "overall_grade" VARCHAR(10) NOT NULL,
    "division" INTEGER,
    "total_score" DECIMAL(10,2),
    "max_score" DECIMAL(10,2),
    "percentage" DECIMAL(5,2),
    "school_rank" INTEGER,
    "region_rank" INTEGER,
    "certificate_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "national_exam_results_pkey" PRIMARY KEY ("result_id")
);

-- CreateTable
CREATE TABLE "student_peer_evaluations" (
    "evaluation_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "evaluator_id" INTEGER NOT NULL,
    "class_id" INTEGER NOT NULL,
    "term" VARCHAR(20) NOT NULL,
    "academic_year" VARCHAR(20) NOT NULL,
    "teamwork_score" DECIMAL(3,2) NOT NULL,
    "participation_score" DECIMAL(3,2) NOT NULL,
    "collaboration_score" DECIMAL(3,2) NOT NULL,
    "respect_score" DECIMAL(3,2) NOT NULL,
    "overall_rating" DECIMAL(3,2) NOT NULL,
    "comments" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_peer_evaluations_pkey" PRIMARY KEY ("evaluation_id")
);

-- CreateTable
CREATE TABLE "student_notes" (
    "note_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "subject" VARCHAR(100),
    "tags" VARCHAR(50)[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_notes_pkey" PRIMARY KEY ("note_id")
);

-- CreateTable
CREATE TABLE "ai_books" (
    "book_id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "subject_id" INTEGER,
    "grade_level" INTEGER NOT NULL,
    "description" TEXT,
    "content" JSONB NOT NULL,
    "author" VARCHAR(100),
    "cover_image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_books_pkey" PRIMARY KEY ("book_id")
);

-- CreateTable
CREATE TABLE "book_progress" (
    "progress_id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "current_page" INTEGER NOT NULL DEFAULT 0,
    "total_pages" INTEGER NOT NULL DEFAULT 0,
    "completion_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_progress_pkey" PRIMARY KEY ("progress_id")
);

-- CreateTable
CREATE TABLE "book_bookmarks" (
    "bookmark_id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "page_number" INTEGER NOT NULL,
    "section_title" VARCHAR(200),
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_bookmarks_pkey" PRIMARY KEY ("bookmark_id")
);

-- CreateTable
CREATE TABLE "book_highlights" (
    "highlight_id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "page_number" INTEGER NOT NULL,
    "text_content" TEXT NOT NULL,
    "color" VARCHAR(20) NOT NULL DEFAULT 'yellow',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_highlights_pkey" PRIMARY KEY ("highlight_id")
);

-- CreateTable
CREATE TABLE "book_annotations" (
    "annotation_id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "page_number" INTEGER NOT NULL,
    "annotation_type" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_annotations_pkey" PRIMARY KEY ("annotation_id")
);

-- CreateTable
CREATE TABLE "book_quizzes" (
    "quiz_id" SERIAL NOT NULL,
    "book_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "questions" JSONB NOT NULL,
    "passing_score" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_quizzes_pkey" PRIMARY KEY ("quiz_id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "attempt_id" SERIAL NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "student_notification_preferences" (
    "preference_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "email_grades" BOOLEAN NOT NULL DEFAULT true,
    "email_attendance" BOOLEAN NOT NULL DEFAULT true,
    "email_conduct" BOOLEAN NOT NULL DEFAULT true,
    "email_assignments" BOOLEAN NOT NULL DEFAULT true,
    "email_announcements" BOOLEAN NOT NULL DEFAULT true,
    "sms_grades" BOOLEAN NOT NULL DEFAULT false,
    "sms_attendance" BOOLEAN NOT NULL DEFAULT false,
    "sms_conduct" BOOLEAN NOT NULL DEFAULT false,
    "sms_assignments" BOOLEAN NOT NULL DEFAULT false,
    "sms_announcements" BOOLEAN NOT NULL DEFAULT false,
    "in_app_grades" BOOLEAN NOT NULL DEFAULT true,
    "in_app_attendance" BOOLEAN NOT NULL DEFAULT true,
    "in_app_conduct" BOOLEAN NOT NULL DEFAULT true,
    "in_app_assignments" BOOLEAN NOT NULL DEFAULT true,
    "in_app_announcements" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_notification_preferences_pkey" PRIMARY KEY ("preference_id")
);

-- CreateTable
CREATE TABLE "student_login_history" (
    "login_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_time" TIMESTAMP(3),
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "device_type" VARCHAR(50),
    "login_status" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',

    CONSTRAINT "student_login_history_pkey" PRIMARY KEY ("login_id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "profile_id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "phone_number" VARCHAR(20),
    "email_address" VARCHAR(100),
    "home_address" TEXT,
    "profile_picture_url" TEXT,
    "bio" TEXT,
    "interests" VARCHAR(50)[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("profile_id")
);

-- CreateTable
CREATE TABLE "virtual_classes" (
    "virtual_class_id" SERIAL NOT NULL,
    "class_subject_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "meeting_link" TEXT NOT NULL,
    "meeting_id" VARCHAR(100),
    "meeting_password" VARCHAR(50),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_pattern" VARCHAR(50),
    "max_participants" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_classes_pkey" PRIMARY KEY ("virtual_class_id")
);

-- CreateTable
CREATE TABLE "live_sessions" (
    "session_id" SERIAL NOT NULL,
    "virtual_class_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3) NOT NULL,
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    "recording_url" TEXT,
    "chat_enabled" BOOLEAN NOT NULL DEFAULT true,
    "recording_enabled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "live_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "session_attendances" (
    "attendance_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "join_time" TIMESTAMP(3),
    "leave_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "engagement_score" DECIMAL(3,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_attendances_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "course_materials" (
    "material_id" SERIAL NOT NULL,
    "class_subject_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "material_type" VARCHAR(50) NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "duration_minutes" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_materials_pkey" PRIMARY KEY ("material_id")
);

-- CreateTable
CREATE TABLE "material_progress" (
    "progress_id" SERIAL NOT NULL,
    "material_id" INTEGER NOT NULL,
    "student_id" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completion_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_accessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "time_spent_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_progress_pkey" PRIMARY KEY ("progress_id")
);

-- CreateTable
CREATE TABLE "discussion_forums" (
    "forum_id" SERIAL NOT NULL,
    "class_subject_id" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussion_forums_pkey" PRIMARY KEY ("forum_id")
);

-- CreateTable
CREATE TABLE "forum_posts" (
    "post_id" SERIAL NOT NULL,
    "forum_id" INTEGER NOT NULL,
    "student_id" INTEGER,
    "teacher_id" INTEGER,
    "parent_post_id" INTEGER,
    "content" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "teacher_settings" (
    "settings_id" SERIAL NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "grading_rubric" JSONB,
    "assignment_defaults" JSONB,
    "notification_preferences" JSONB,
    "teaching_preferences" JSONB,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_settings_pkey" PRIMARY KEY ("settings_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_invigilators_exam_id_teacher_id_key" ON "exam_invigilators"("exam_id", "teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_results_exam_id_student_id_key" ON "exam_results"("exam_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "peer_evaluations_form_id_evaluator_id_evaluatee_id_term_key" ON "peer_evaluations"("form_id", "evaluator_id", "evaluatee_id", "term");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_attendees_meeting_id_user_id_key" ON "meeting_attendees"("meeting_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_minutes_meeting_id_key" ON "meeting_minutes"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "department_settings_department_key" ON "department_settings"("department");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_maps_subject_id_grade_level_term_key" ON "curriculum_maps"("subject_id", "grade_level", "term");

-- CreateIndex
CREATE UNIQUE INDEX "school_profile_school_code_key" ON "school_profile"("school_code");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_year_name_key" ON "academic_years"("year_name");

-- CreateIndex
CREATE UNIQUE INDEX "grading_scales_scale_name_key" ON "grading_scales"("scale_name");

-- CreateIndex
CREATE UNIQUE INDEX "asset_inventory_asset_code_key" ON "asset_inventory"("asset_code");

-- CreateIndex
CREATE UNIQUE INDEX "ptsa_meeting_attendees_meeting_id_user_id_key" ON "ptsa_meeting_attendees"("meeting_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ptsa_meeting_minutes_meeting_id_key" ON "ptsa_meeting_minutes"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_survey_responses_survey_id_parent_id_key" ON "parent_survey_responses"("survey_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "sic_meeting_attendees_meeting_id_user_id_key" ON "sic_meeting_attendees"("meeting_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sic_meeting_minutes_meeting_id_key" ON "sic_meeting_minutes"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "sic_training_completions_training_id_user_id_key" ON "sic_training_completions"("training_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "non_academic_staff_user_id_key" ON "non_academic_staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "non_academic_staff_employee_id_key" ON "non_academic_staff"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendance_staff_id_date_key" ON "staff_attendance"("staff_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_request_number_key" ON "purchase_requests"("request_number");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_code_key" ON "inventory"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "security_personnel_user_id_key" ON "security_personnel"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "security_personnel_employee_id_key" ON "security_personnel"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vehicle_number_key" ON "vehicles"("vehicle_number");

-- CreateIndex
CREATE UNIQUE INDEX "food_inventory_item_code_key" ON "food_inventory"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "conduct_grades_student_id_term_academic_year_key" ON "conduct_grades"("student_id", "term", "academic_year");

-- CreateIndex
CREATE UNIQUE INDEX "conference_bookings_conference_id_parent_id_student_id_key" ON "conference_bookings"("conference_id", "parent_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_notification_preferences_parent_id_key" ON "parent_notification_preferences"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "parent_child_association_requests_parent_id_student_id_key" ON "parent_child_association_requests"("parent_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "national_exam_results_student_id_exam_type_exam_year_key" ON "national_exam_results"("student_id", "exam_type", "exam_year");

-- CreateIndex
CREATE UNIQUE INDEX "student_peer_evaluations_student_id_evaluator_id_term_acade_key" ON "student_peer_evaluations"("student_id", "evaluator_id", "term", "academic_year");

-- CreateIndex
CREATE INDEX "student_notes_student_id_idx" ON "student_notes"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_progress_book_id_student_id_key" ON "book_progress"("book_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_bookmarks_book_id_student_id_page_number_key" ON "book_bookmarks"("book_id", "student_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "student_notification_preferences_student_id_key" ON "student_notification_preferences"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_student_id_key" ON "student_profiles"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_attendances_session_id_student_id_key" ON "session_attendances"("session_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_progress_material_id_student_id_key" ON "material_progress"("material_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_settings_teacher_id_key" ON "teacher_settings"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "submissions_assignment_id_student_id_resubmission_number_key" ON "submissions"("assignment_id", "student_id", "resubmission_number");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_parent_submission_id_fkey" FOREIGN KEY ("parent_submission_id") REFERENCES "submissions"("submission_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("class_subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_allocations" ADD CONSTRAINT "resource_allocations_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("resource_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_requests" ADD CONSTRAINT "resource_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("class_subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_invigilators" ADD CONSTRAINT "exam_invigilators_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("exam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_invigilators" ADD CONSTRAINT "exam_invigilators_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("exam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_results" ADD CONSTRAINT "exam_results_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_evaluation_forms" ADD CONSTRAINT "peer_evaluation_forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_evaluations" ADD CONSTRAINT "peer_evaluations_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "peer_evaluation_forms"("form_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_evaluations" ADD CONSTRAINT "peer_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peer_evaluations" ADD CONSTRAINT "peer_evaluations_evaluatee_id_fkey" FOREIGN KEY ("evaluatee_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_meetings" ADD CONSTRAINT "department_meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "department_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "department_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_minutes" ADD CONSTRAINT "meeting_minutes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_plans" ADD CONSTRAINT "intervention_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervention_plans" ADD CONSTRAINT "intervention_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_maps" ADD CONSTRAINT "curriculum_maps_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_maps" ADD CONSTRAINT "curriculum_maps_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenditures" ADD CONSTRAINT "expenditures_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("budget_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_bookings" ADD CONSTRAINT "facility_bookings_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("facility_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sip_progress" ADD CONSTRAINT "sip_progress_sip_id_fkey" FOREIGN KEY ("sip_id") REFERENCES "school_improvement_plans"("sip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sip_feedback" ADD CONSTRAINT "sip_feedback_sip_id_fkey" FOREIGN KEY ("sip_id") REFERENCES "school_improvement_plans"("sip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sip_feedback" ADD CONSTRAINT "sip_feedback_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_feedback" ADD CONSTRAINT "ptsa_feedback_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_feedback" ADD CONSTRAINT "ptsa_feedback_responded_by_fkey" FOREIGN KEY ("responded_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_advisories" ADD CONSTRAINT "budget_advisories_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_advisories" ADD CONSTRAINT "budget_advisories_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_meetings" ADD CONSTRAINT "ptsa_meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_meetings" ADD CONSTRAINT "ptsa_meetings_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_meeting_attendees" ADD CONSTRAINT "ptsa_meeting_attendees_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "ptsa_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_meeting_attendees" ADD CONSTRAINT "ptsa_meeting_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_meeting_minutes" ADD CONSTRAINT "ptsa_meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "ptsa_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_announcements" ADD CONSTRAINT "ptsa_announcements_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "ptsa_meetings"("meeting_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_announcements" ADD CONSTRAINT "ptsa_announcements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ptsa_fund_transactions" ADD CONSTRAINT "ptsa_fund_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_leave_requests" ADD CONSTRAINT "staff_leave_requests_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "non_academic_staff"("staff_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_surveys" ADD CONSTRAINT "parent_surveys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_survey_responses" ADD CONSTRAINT "parent_survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "parent_surveys"("survey_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_survey_responses" ADD CONSTRAINT "parent_survey_responses_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("parent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sic_meeting_attendees" ADD CONSTRAINT "sic_meeting_attendees_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "sic_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sic_meeting_minutes" ADD CONSTRAINT "sic_meeting_minutes_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "sic_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sic_agenda_items" ADD CONSTRAINT "sic_agenda_items_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "sic_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sic_resolutions" ADD CONSTRAINT "sic_resolutions_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "sic_meetings"("meeting_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sic_assessment_responses" ADD CONSTRAINT "sic_assessment_responses_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "sic_needs_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sic_training_completions" ADD CONSTRAINT "sic_training_completions_training_id_fkey" FOREIGN KEY ("training_id") REFERENCES "sic_trainings"("training_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "non_academic_staff" ADD CONSTRAINT "non_academic_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "non_academic_staff"("staff_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facility_maintenance" ADD CONSTRAINT "facility_maintenance_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("facility_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("supplier_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("inventory_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_assignments" ADD CONSTRAINT "driver_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_schedules" ADD CONSTRAINT "transport_schedules_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_transactions" ADD CONSTRAINT "food_transactions_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "food_inventory"("food_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conduct_comments" ADD CONSTRAINT "conduct_comments_conduct_id_fkey" FOREIGN KEY ("conduct_id") REFERENCES "conduct_grades"("conduct_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_bookings" ADD CONSTRAINT "conference_bookings_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "parent_teacher_conferences"("conference_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_peer_evaluations" ADD CONSTRAINT "student_peer_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_peer_evaluations" ADD CONSTRAINT "student_peer_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_notes" ADD CONSTRAINT "student_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_books" ADD CONSTRAINT "ai_books_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("subject_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_progress" ADD CONSTRAINT "book_progress_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ai_books"("book_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_progress" ADD CONSTRAINT "book_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_bookmarks" ADD CONSTRAINT "book_bookmarks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_highlights" ADD CONSTRAINT "book_highlights_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_annotations" ADD CONSTRAINT "book_annotations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_quizzes" ADD CONSTRAINT "book_quizzes_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "ai_books"("book_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "book_quizzes"("quiz_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_notification_preferences" ADD CONSTRAINT "student_notification_preferences_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_login_history" ADD CONSTRAINT "student_login_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "virtual_classes" ADD CONSTRAINT "virtual_classes_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("class_subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_virtual_class_id_fkey" FOREIGN KEY ("virtual_class_id") REFERENCES "virtual_classes"("virtual_class_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "live_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session_attendances" ADD CONSTRAINT "session_attendances_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_materials" ADD CONSTRAINT "course_materials_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("class_subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_progress" ADD CONSTRAINT "material_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussion_forums" ADD CONSTRAINT "discussion_forums_class_subject_id_fkey" FOREIGN KEY ("class_subject_id") REFERENCES "class_subject"("class_subject_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_forum_id_fkey" FOREIGN KEY ("forum_id") REFERENCES "discussion_forums"("forum_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("student_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forum_posts" ADD CONSTRAINT "forum_posts_parent_post_id_fkey" FOREIGN KEY ("parent_post_id") REFERENCES "forum_posts"("post_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_settings" ADD CONSTRAINT "teacher_settings_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("teacher_id") ON DELETE CASCADE ON UPDATE CASCADE;
