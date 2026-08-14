-- Additive employee lifecycle migration.
-- Safe to re-run against the current PostgreSQL schema.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'EmploymentStatus'
      AND pg_enum.enumlabel = 'Offboarded'
  ) THEN
    ALTER TYPE "EmploymentStatus" ADD VALUE 'Offboarded';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "employee_onboardings" (
  "id" VARCHAR(36) PRIMARY KEY,
  "candidate_id" VARCHAR(36) NOT NULL,
  "employee_id" VARCHAR(36) NOT NULL,
  "onboarded_by_id" VARCHAR(36) NOT NULL,
  "onboarded_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_onboardings_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES "recruitment_candidates"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_onboardings_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_onboardings_onboarded_by_id_fkey"
    FOREIGN KEY ("onboarded_by_id") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_onboardings_candidate_id_key"
  ON "employee_onboardings"("candidate_id");
CREATE UNIQUE INDEX IF NOT EXISTS "employee_onboardings_employee_id_key"
  ON "employee_onboardings"("employee_id");
CREATE INDEX IF NOT EXISTS "employee_onboardings_onboarded_by_id_onboarded_at_idx"
  ON "employee_onboardings"("onboarded_by_id", "onboarded_at");

CREATE TABLE IF NOT EXISTS "employee_offboardings" (
  "id" VARCHAR(36) PRIMARY KEY,
  "employee_id" VARCHAR(36) NOT NULL,
  "reason" TEXT NOT NULL,
  "offboarded_by_id" VARCHAR(36) NOT NULL,
  "offboarded_at" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_offboardings_employee_id_fkey"
    FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "employee_offboardings_offboarded_by_id_fkey"
    FOREIGN KEY ("offboarded_by_id") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "employee_offboardings_employee_id_key"
  ON "employee_offboardings"("employee_id");
CREATE INDEX IF NOT EXISTS "employee_offboardings_offboarded_by_id_offboarded_at_idx"
  ON "employee_offboardings"("offboarded_by_id", "offboarded_at");
