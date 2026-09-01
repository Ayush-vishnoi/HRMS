-- My Assets feature: allocation/receipt tracking on assets + employee asset request queue
ALTER TABLE "assets" ADD COLUMN "allocation_date" VARCHAR(30);
ALTER TABLE "assets" ADD COLUMN "acknowledged_at" TIMESTAMPTZ(6);

-- CreateEnum
CREATE TYPE "AssetRequestType" AS ENUM ('New Asset', 'Issue Report', 'Return');

-- CreateEnum
CREATE TYPE "AssetRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "asset_requests" (
    "id" VARCHAR(36) NOT NULL,
    "type" "AssetRequestType" NOT NULL,
    "status" "AssetRequestStatus" NOT NULL DEFAULT 'Pending',
    "requested_by_id" VARCHAR(36) NOT NULL,
    "asset_id" VARCHAR(36),
    "category" "AssetCategory",
    "reason" VARCHAR(500) NOT NULL,
    "urgency" "TicketPriority",
    "reviewed_by_id" VARCHAR(36),
    "reviewed_at" TIMESTAMPTZ(6),
    "review_note" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "asset_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_asset_requests_status_type" ON "asset_requests"("status", "type");

-- CreateIndex
CREATE INDEX "idx_asset_requests_requester" ON "asset_requests"("requested_by_id");

-- AddForeignKey
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "asset_requests" ADD CONSTRAINT "asset_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
