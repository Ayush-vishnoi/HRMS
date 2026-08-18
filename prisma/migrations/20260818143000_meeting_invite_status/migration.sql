-- Add the explicit one-to-one meeting type and invitation lifecycle.
-- Keep legacy RSVP columns during the transition.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    WHERE pg_type.typname = 'MeetingType'
      AND pg_enum.enumlabel = 'ONE_TO_ONE'
  ) THEN
    ALTER TYPE "MeetingType" ADD VALUE 'ONE_TO_ONE' BEFORE 'TEAM';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'InviteStatus'
  ) THEN
    CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');
  END IF;
END
$$;

ALTER TABLE "meeting_attendees"
  ADD COLUMN IF NOT EXISTS "invite_status" "InviteStatus" NOT NULL DEFAULT 'PENDING';
