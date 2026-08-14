-- ============================================================================
-- HRMS POSTGRESQL DATABASE SCHEMA
-- Generated strictly according to existing HRMS project features
-- ============================================================================

-- Drop existing tables (in reverse dependency order) if needed
DROP TABLE IF EXISTS "auth_verification_tokens" CASCADE;
DROP TABLE IF EXISTS "auth_sessions" CASCADE;
DROP TABLE IF EXISTS "auth_accounts" CASCADE;
DROP TABLE IF EXISTS "employee_offboardings" CASCADE;
DROP TABLE IF EXISTS "employee_onboardings" CASCADE;
DROP TABLE IF EXISTS "recruitment_candidates" CASCADE;
DROP TABLE IF EXISTS "recruitment_jobs" CASCADE;
DROP TABLE IF EXISTS "assets" CASCADE;
DROP TABLE IF EXISTS "help_desk_tickets" CASCADE;
DROP TABLE IF EXISTS "policy_acknowledgements" CASCADE;
DROP TABLE IF EXISTS "company_policies" CASCADE;
DROP TABLE IF EXISTS "document_requests" CASCADE;
DROP TABLE IF EXISTS "employee_documents" CASCADE;
DROP TABLE IF EXISTS "performance_kras" CASCADE;
DROP TABLE IF EXISTS "payslips" CASCADE;
DROP TABLE IF EXISTS "meeting_attendees" CASCADE;
DROP TABLE IF EXISTS "meetings" CASCADE;
DROP TABLE IF EXISTS "team_member_metadata" CASCADE;
DROP TABLE IF EXISTS "team_members" CASCADE;
DROP TABLE IF EXISTS "managed_teams" CASCADE;
DROP TABLE IF EXISTS "leave_requests" CASCADE;
DROP TABLE IF EXISTS "leave_balances" CASCADE;
DROP TABLE IF EXISTS "late_clock_in_requests" CASCADE;
DROP TABLE IF EXISTS "attendance_records" CASCADE;
DROP TABLE IF EXISTS "employees" CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "EmploymentStatus" CASCADE;
DROP TYPE IF EXISTS "AttendanceStatus" CASCADE;
DROP TYPE IF EXISTS "LateClockInStatus" CASCADE;
DROP TYPE IF EXISTS "LeaveType" CASCADE;
DROP TYPE IF EXISTS "LeaveRequestStatus" CASCADE;
DROP TYPE IF EXISTS "MeetingType" CASCADE;
DROP TYPE IF EXISTS "MeetingStatus" CASCADE;
DROP TYPE IF EXISTS "Recurrence" CASCADE;
DROP TYPE IF EXISTS "RsvpStatus" CASCADE;
DROP TYPE IF EXISTS "PayslipStatus" CASCADE;
DROP TYPE IF EXISTS "KraPriority" CASCADE;
DROP TYPE IF EXISTS "KraStatus" CASCADE;
DROP TYPE IF EXISTS "TeamRisk" CASCADE;
DROP TYPE IF EXISTS "DocumentStatus" CASCADE;
DROP TYPE IF EXISTS "DocumentRequestStatus" CASCADE;
DROP TYPE IF EXISTS "PolicyCategory" CASCADE;
DROP TYPE IF EXISTS "TicketCategory" CASCADE;
DROP TYPE IF EXISTS "TicketPriority" CASCADE;
DROP TYPE IF EXISTS "TicketStatus" CASCADE;
DROP TYPE IF EXISTS "AssetCategory" CASCADE;
DROP TYPE IF EXISTS "AssetStatus" CASCADE;
DROP TYPE IF EXISTS "AssetCondition" CASCADE;
DROP TYPE IF EXISTS "JobEmploymentType" CASCADE;
DROP TYPE IF EXISTS "JobStatus" CASCADE;
DROP TYPE IF EXISTS "CandidateStage" CASCADE;
DROP TYPE IF EXISTS "CandidateRecommendation" CASCADE;

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------
CREATE TYPE "UserRole" AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE "EmploymentStatus" AS ENUM ('Active', 'On Leave', 'Remote', 'Offboarded');
CREATE TYPE "AttendanceStatus" AS ENUM ('On Time', 'Late', 'Half Day', 'Absent', 'On Leave');
CREATE TYPE "LateClockInStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "LeaveType" AS ENUM ('Casual', 'Sick', 'Earned', 'WFH');
CREATE TYPE "LeaveRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');
CREATE TYPE "MeetingType" AS ENUM ('TEAM', 'ORG_EVENT');
CREATE TYPE "MeetingStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "RsvpStatus" AS ENUM ('ACCEPTED', 'DECLINED', 'PENDING');
CREATE TYPE "PayslipStatus" AS ENUM ('Paid', 'Processing');
CREATE TYPE "KraPriority" AS ENUM ('Critical', 'High', 'Medium', 'Low');
CREATE TYPE "KraStatus" AS ENUM ('Not Started', 'In Progress', 'Under Review', 'Completed');
CREATE TYPE "TeamRisk" AS ENUM ('On track', 'Needs attention', 'At risk');
CREATE TYPE "DocumentStatus" AS ENUM ('Verified', 'Under Review', 'Action Required');
CREATE TYPE "DocumentRequestStatus" AS ENUM ('Pending', 'In Review', 'Completed');
CREATE TYPE "PolicyCategory" AS ENUM ('Code of Conduct', 'Leave & Attendance', 'Information Security', 'Workplace Safety', 'Anti-Harassment', 'Remote Work');
CREATE TYPE "TicketCategory" AS ENUM ('Attendance', 'Leave', 'Payroll', 'Documents', 'Policy', 'Grievance / Complaint', 'Other');
CREATE TYPE "TicketPriority" AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE "TicketStatus" AS ENUM ('Open', 'In Progress', 'Resolved');
CREATE TYPE "AssetCategory" AS ENUM ('Laptop', 'Monitor', 'Mobile', 'Access Card', 'Other');
CREATE TYPE "AssetStatus" AS ENUM ('Assigned', 'Available', 'Repair', 'Retired');
CREATE TYPE "AssetCondition" AS ENUM ('New', 'Good', 'Fair', 'Needs repair');
CREATE TYPE "JobEmploymentType" AS ENUM ('Full-time', 'Contract');
CREATE TYPE "JobStatus" AS ENUM ('Open', 'On hold', 'Closed');
CREATE TYPE "CandidateStage" AS ENUM ('New', 'Screening', 'Interview', 'Shortlisted', 'Rejected');
CREATE TYPE "CandidateRecommendation" AS ENUM ('Strong match', 'Review', 'Low match');

-- ----------------------------------------------------------------------------
-- 2. EMPLOYEES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "employees" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_code" VARCHAR(30) NOT NULL UNIQUE,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255),
    "role_title" VARCHAR(100) NOT NULL,
    "user_role" "UserRole" NOT NULL DEFAULT 'employee',
    "department" VARCHAR(80) NOT NULL,
    "phone" VARCHAR(30),
    "avatar_url" TEXT,
    "status" "EmploymentStatus" NOT NULL DEFAULT 'Active',
    "join_date" VARCHAR(30) NOT NULL,
    "location" VARCHAR(120) NOT NULL,
    "salary" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    "manager_id" VARCHAR(36) REFERENCES "employees"("id") ON DELETE SET NULL,
    "failed_login_attempts" INT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP WITH TIME ZONE,
    "last_login_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 2A. AUTHENTICATION TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE "auth_accounts" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "type" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(100) NOT NULL,
    "provider_account_id" VARCHAR(150) NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INT,
    "token_type" VARCHAR(50),
    "scope" VARCHAR(255),
    "id_token" TEXT,
    "session_state" VARCHAR(255),
    CONSTRAINT "auth_accounts_provider_provider_account_id_key"
      UNIQUE ("provider", "provider_account_id")
);
CREATE INDEX "auth_accounts_employee_id_idx" ON "auth_accounts"("employee_id");

CREATE TABLE "auth_sessions" (
    "id" VARCHAR(36) PRIMARY KEY,
    "session_token" VARCHAR(255) NOT NULL UNIQUE,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "auth_sessions_employee_id_idx" ON "auth_sessions"("employee_id");
CREATE INDEX "auth_sessions_expires_idx" ON "auth_sessions"("expires");

CREATE TABLE "auth_verification_tokens" (
    "identifier" VARCHAR(255) NOT NULL,
    "token" VARCHAR(255) NOT NULL UNIQUE,
    "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "auth_verification_tokens_identifier_token_key"
      UNIQUE ("identifier", "token")
);

-- ----------------------------------------------------------------------------
-- 3. ATTENDANCE RECORDS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "attendance_records" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "date" VARCHAR(30) NOT NULL,
    "check_in" VARCHAR(20) NOT NULL,
    "check_out" VARCHAR(20) NOT NULL,
    "hours_worked" VARCHAR(20) NOT NULL DEFAULT '0h 0m',
    "status" "AttendanceStatus" NOT NULL DEFAULT 'On Time',
    "location" VARCHAR(100) NOT NULL DEFAULT 'Office - HQ',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_attendance_emp_date" ON "attendance_records"("employee_id", "date");

-- ----------------------------------------------------------------------------
-- 4. LATE CLOCK-IN REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "late_clock_in_requests" (
    "id" VARCHAR(36) PRIMARY KEY,
    "requester_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "request_date" VARCHAR(30) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LateClockInStatus" NOT NULL DEFAULT 'pending',
    "requested_at" VARCHAR(50) NOT NULL,
    "reviewed_by_id" VARCHAR(36) REFERENCES "employees"("id") ON DELETE SET NULL,
    "reviewed_at" VARCHAR(50),
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_late_clockin_requester" ON "late_clock_in_requests"("requester_id", "request_date");

-- ----------------------------------------------------------------------------
-- 5. LEAVE BALANCES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "leave_balances" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "year" INT NOT NULL DEFAULT 2026,
    "leave_type" "LeaveType" NOT NULL,
    "total" INT NOT NULL,
    "used" INT NOT NULL DEFAULT 0,
    "remaining" INT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_leave_balance_emp_year_type" UNIQUE ("employee_id", "year", "leave_type")
);

-- ----------------------------------------------------------------------------
-- 6. LEAVE REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "leave_requests" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "leave_type" "LeaveType" NOT NULL,
    "start_date" VARCHAR(30) NOT NULL,
    "end_date" VARCHAR(30) NOT NULL,
    "days" INT NOT NULL CHECK ("days" > 0),
    "reason" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'Pending',
    "applied_on" VARCHAR(30) NOT NULL,
    "reviewer_id" VARCHAR(36) REFERENCES "employees"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_leave_req_emp_status" ON "leave_requests"("employee_id", "status");

-- ----------------------------------------------------------------------------
-- 7. MANAGED TEAMS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "managed_teams" (
    "id" VARCHAR(36) PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "department" VARCHAR(80) NOT NULL,
    "manager_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "leader_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "focus" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 8. TEAM MEMBERS (JOIN TABLE)
-- ----------------------------------------------------------------------------
CREATE TABLE "team_members" (
    "id" VARCHAR(36) PRIMARY KEY,
    "team_id" VARCHAR(36) NOT NULL REFERENCES "managed_teams"("id") ON DELETE CASCADE,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_team_member" UNIQUE ("team_id", "employee_id")
);

-- ----------------------------------------------------------------------------
-- 9. TEAM MEMBER METADATA TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "team_member_metadata" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "manager_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "focus" TEXT NOT NULL,
    "workload" INT NOT NULL DEFAULT 70 CHECK ("workload" BETWEEN 0 AND 100),
    "goal_progress" INT NOT NULL DEFAULT 60 CHECK ("goal_progress" BETWEEN 0 AND 100),
    "goal_label" VARCHAR(150) NOT NULL,
    "next_one_to_one" VARCHAR(50) NOT NULL,
    "risk" "TeamRisk" NOT NULL DEFAULT 'On track',
    "notes" TEXT NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_team_metadata_emp_mgr" UNIQUE ("employee_id", "manager_id")
);

-- ----------------------------------------------------------------------------
-- 10. MEETINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "meetings" (
    "id" VARCHAR(36) PRIMARY KEY,
    "title" VARCHAR(150) NOT NULL,
    "type" "MeetingType" NOT NULL DEFAULT 'TEAM',
    "description" TEXT,
    "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT FALSE,
    "location" VARCHAR(150),
    "video_link" VARCHAR(255),
    "organizer_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "department" VARCHAR(80),
    "recurrence" "Recurrence" NOT NULL DEFAULT 'NONE',
    "reminder_minutes" INT DEFAULT 15,
    "status" "MeetingStatus" NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_meetings_times" ON "meetings"("starts_at", "ends_at");

-- ----------------------------------------------------------------------------
-- 11. MEETING ATTENDEES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "meeting_attendees" (
    "id" VARCHAR(36) PRIMARY KEY,
    "meeting_id" VARCHAR(36) NOT NULL REFERENCES "meetings"("id") ON DELETE CASCADE,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "rsvp" "RsvpStatus" NOT NULL DEFAULT 'PENDING',
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_meeting_attendee" UNIQUE ("meeting_id", "employee_id")
);

-- ----------------------------------------------------------------------------
-- 12. PAYSLIPS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "payslips" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "month_year" VARCHAR(30) NOT NULL,
    "basic_salary" NUMERIC(10, 2) NOT NULL,
    "hra" NUMERIC(10, 2) NOT NULL,
    "conveyance" NUMERIC(10, 2) NOT NULL,
    "special_allowance" NUMERIC(10, 2) NOT NULL,
    "pf_deduction" NUMERIC(10, 2) NOT NULL,
    "tax_deduction" NUMERIC(10, 2) NOT NULL,
    "gross_earnings" NUMERIC(10, 2) NOT NULL,
    "total_deductions" NUMERIC(10, 2) NOT NULL,
    "net_payable" NUMERIC(10, 2) NOT NULL,
    "payment_date" VARCHAR(50) NOT NULL,
    "status" "PayslipStatus" NOT NULL DEFAULT 'Paid',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_payslip_emp_month" UNIQUE ("employee_id", "month_year")
);

-- ----------------------------------------------------------------------------
-- 13. PERFORMANCE KRAS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "performance_kras" (
    "id" VARCHAR(36) PRIMARY KEY,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT NOT NULL,
    "key_result" TEXT NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "assigned_to_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "assigned_by_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "assigned_on" VARCHAR(30) NOT NULL,
    "due_date" VARCHAR(30) NOT NULL,
    "priority" "KraPriority" NOT NULL DEFAULT 'Medium',
    "status" "KraStatus" NOT NULL DEFAULT 'Not Started',
    "progress" INT NOT NULL DEFAULT 0 CHECK ("progress" BETWEEN 0 AND 100),
    "weightage" INT NOT NULL DEFAULT 20 CHECK ("weightage" BETWEEN 0 AND 100),
    "last_update" TEXT,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_kras_assigned_status" ON "performance_kras"("assigned_to_id", "status");

-- ----------------------------------------------------------------------------
-- 14. EMPLOYEE DOCUMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "employee_documents" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "name" VARCHAR(150) NOT NULL,
    "type" VARCHAR(80) NOT NULL,
    "file_url" TEXT,
    "size" VARCHAR(20) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'Under Review',
    "note" TEXT,
    "uploaded_on" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_emp_docs_status" ON "employee_documents"("employee_id", "status");

-- ----------------------------------------------------------------------------
-- 15. DOCUMENT REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "document_requests" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "document_type" VARCHAR(100) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'Pending',
    "requested_on" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_doc_requests_status" ON "document_requests"("employee_id", "status");

-- ----------------------------------------------------------------------------
-- 16. COMPANY POLICIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "company_policies" (
    "id" VARCHAR(36) PRIMARY KEY,
    "title" VARCHAR(150) NOT NULL,
    "summary" TEXT NOT NULL,
    "category" "PolicyCategory" NOT NULL,
    "version" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
    "effective_date" VARCHAR(30) NOT NULL,
    "updated_on" VARCHAR(30) NOT NULL,
    "uploaded_by_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "mandatory" BOOLEAN NOT NULL DEFAULT TRUE,
    "acknowledgement_required" BOOLEAN NOT NULL DEFAULT TRUE,
    "file_name" VARCHAR(150) NOT NULL,
    "file_size" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 17. POLICY ACKNOWLEDGEMENTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "policy_acknowledgements" (
    "id" VARCHAR(36) PRIMARY KEY,
    "policy_id" VARCHAR(36) NOT NULL REFERENCES "company_policies"("id") ON DELETE CASCADE,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "acknowledged_on" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "uq_policy_ack" UNIQUE ("policy_id", "employee_id")
);

-- ----------------------------------------------------------------------------
-- 18. HELP DESK TICKETS TABLE (ASK HR & GRIEVANCES)
-- ----------------------------------------------------------------------------
CREATE TABLE "help_desk_tickets" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "category" "TicketCategory" NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'Medium',
    "subject" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'Open',
    "resolution" TEXT,
    "resolved_at" VARCHAR(50),
    "resolved_by_id" VARCHAR(36) REFERENCES "employees"("id") ON DELETE SET NULL,
    "created_at" VARCHAR(50) NOT NULL
);
CREATE INDEX "idx_help_desk_lookup" ON "help_desk_tickets"("employee_id", "category", "status");

-- ----------------------------------------------------------------------------
-- 19. ASSETS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "assets" (
    "id" VARCHAR(36) PRIMARY KEY,
    "asset_tag" VARCHAR(50) NOT NULL UNIQUE,
    "category" "AssetCategory" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "brand" VARCHAR(80) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "serial_number" VARCHAR(100) NOT NULL UNIQUE,
    "purchase_date" VARCHAR(30) NOT NULL,
    "purchase_cost" VARCHAR(30),
    "warranty_until" VARCHAR(30),
    "status" "AssetStatus" NOT NULL DEFAULT 'Available',
    "assigned_to_id" VARCHAR(36) REFERENCES "employees"("id") ON DELETE SET NULL,
    "location" VARCHAR(100) NOT NULL,
    "condition" "AssetCondition" NOT NULL DEFAULT 'Good',
    "last_checked" VARCHAR(30) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_assets_status_cat" ON "assets"("status", "category");

-- ----------------------------------------------------------------------------
-- 20. RECRUITMENT JOBS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "recruitment_jobs" (
    "id" VARCHAR(36) PRIMARY KEY,
    "title" VARCHAR(150) NOT NULL,
    "department" VARCHAR(80) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "employment_type" "JobEmploymentType" NOT NULL DEFAULT 'Full-time',
    "openings" INT NOT NULL DEFAULT 1 CHECK ("openings" >= 1),
    "applicants" INT NOT NULL DEFAULT 0,
    "status" "JobStatus" NOT NULL DEFAULT 'Open',
    "posted_on" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 21. RECRUITMENT CANDIDATES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE "recruitment_candidates" (
    "id" VARCHAR(36) PRIMARY KEY,
    "job_id" VARCHAR(36) NOT NULL REFERENCES "recruitment_jobs"("id") ON DELETE CASCADE,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "avatar_url" TEXT,
    "applied_on" VARCHAR(30) NOT NULL,
    "stage" "CandidateStage" NOT NULL DEFAULT 'New',
    "score" INT NOT NULL DEFAULT 0 CHECK ("score" BETWEEN 0 AND 100),
    "experience" VARCHAR(50) NOT NULL,
    "current_role" VARCHAR(150) NOT NULL,
    "location" VARCHAR(100) NOT NULL,
    "matched_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missing_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT NOT NULL,
    "recommendation" "CandidateRecommendation" NOT NULL DEFAULT 'Review',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "idx_candidates_job_stage" ON "recruitment_candidates"("job_id", "stage");

-- ----------------------------------------------------------------------------
-- 22. EMPLOYEE LIFECYCLE AUDIT TABLES
-- ----------------------------------------------------------------------------
CREATE TABLE "employee_onboardings" (
    "id" VARCHAR(36) PRIMARY KEY,
    "candidate_id" VARCHAR(36) NOT NULL REFERENCES "recruitment_candidates"("id") ON DELETE RESTRICT,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
    "onboarded_by_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
    "onboarded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_onboardings_candidate_id_key" UNIQUE ("candidate_id"),
    CONSTRAINT "employee_onboardings_employee_id_key" UNIQUE ("employee_id")
);
CREATE INDEX "employee_onboardings_onboarded_by_id_onboarded_at_idx"
  ON "employee_onboardings"("onboarded_by_id", "onboarded_at");

CREATE TABLE "employee_offboardings" (
    "id" VARCHAR(36) PRIMARY KEY,
    "employee_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
    "reason" TEXT NOT NULL,
    "offboarded_by_id" VARCHAR(36) NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
    "offboarded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_offboardings_employee_id_key" UNIQUE ("employee_id")
);
CREATE INDEX "employee_offboardings_offboarded_by_id_offboarded_at_idx"
  ON "employee_offboardings"("offboarded_by_id", "offboarded_at");
