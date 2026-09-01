-- Distinguish employee-uploaded documents from HR-generated ones so the HR
-- "Send" (share for download) action only appears where it makes sense: HR
-- shares documents the employee cannot download yet (exit letters, HR uploads).
-- Employee uploads default to false; the upload API sets it to true.
ALTER TABLE "employee_documents"
  ADD COLUMN IF NOT EXISTS "uploaded_by_employee" BOOLEAN NOT NULL DEFAULT false;
