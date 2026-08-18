-- Backfill final invitation statuses from legacy RSVP values.
-- Pending and tentative legacy values intentionally remain pending.

UPDATE "meeting_attendees"
SET "invite_status" = CASE
  WHEN "rsvp"::text = 'ACCEPTED' THEN 'ACCEPTED'::"InviteStatus"
  WHEN "rsvp"::text = 'DECLINED' THEN 'DECLINED'::"InviteStatus"
  ELSE 'PENDING'::"InviteStatus"
END
WHERE "rsvp"::text IN ('ACCEPTED', 'DECLINED')
  AND "invite_status" = 'PENDING'::"InviteStatus";
