-- Add RSVP tentative responses and optional response context.
-- Safe to re-run against databases where either change already exists.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'RsvpStatus'
      AND pg_enum.enumlabel = 'TENTATIVE'
  ) THEN
    ALTER TYPE "RsvpStatus" ADD VALUE 'TENTATIVE';
  END IF;
END
$$;

ALTER TABLE "meeting_attendees"
  ADD COLUMN IF NOT EXISTS "response_reason" VARCHAR(500);
