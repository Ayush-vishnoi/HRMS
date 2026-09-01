-- HR document request lifecycle: employees can now submit a document in
-- response to an HR-initiated (HRR-) request. The request tracks the
-- submitted document and flows Requested -> Submitted -> Verified/Rejected.

ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Submitted';
ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Verified';
ALTER TYPE "DocumentRequestStatus" ADD VALUE IF NOT EXISTS 'Rejected';

ALTER TABLE "document_requests" ADD COLUMN IF NOT EXISTS "submitted_document_id" VARCHAR(36);

ALTER TABLE "document_requests"
  ADD CONSTRAINT "document_requests_submitted_document_id_fkey"
  FOREIGN KEY ("submitted_document_id") REFERENCES "employee_documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "document_requests_submitted_document_id_idx"
  ON "document_requests"("submitted_document_id");
