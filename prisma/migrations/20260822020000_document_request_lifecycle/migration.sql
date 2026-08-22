-- Replace the legacy document request lifecycle while preserving existing rows.
ALTER TYPE "DocumentRequestStatus" RENAME TO "DocumentRequestStatus_old";

CREATE TYPE "DocumentRequestStatus" AS ENUM ('Pending', 'In Progress', 'Ready', 'Delivered');

ALTER TABLE "document_requests"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "document_requests"
  ALTER COLUMN "status" TYPE "DocumentRequestStatus"
  USING (
    CASE "status"::text
      WHEN 'In Review' THEN 'In Progress'
      WHEN 'Completed' THEN 'Delivered'
      ELSE "status"::text
    END
  )::"DocumentRequestStatus";

ALTER TABLE "document_requests"
  ALTER COLUMN "status" SET DEFAULT 'Pending';

DROP TYPE "DocumentRequestStatus_old";
