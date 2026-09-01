-- Additive-only migration for the two-level expense approval rejection reasons.
-- Applied via raw SQL (instead of `prisma db push`) to avoid touching unrelated
-- schema drift on meeting_attendees.invite_status.
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS manager_rejection_reason TEXT;
ALTER TABLE expense_claims ADD COLUMN IF NOT EXISTS hr_rejection_reason TEXT;
