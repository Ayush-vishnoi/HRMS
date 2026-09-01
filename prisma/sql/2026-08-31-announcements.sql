-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('General', 'Event', 'Holiday', 'Urgent', 'Policy');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('All', 'Department', 'Location', 'Role');

-- CreateTable
CREATE TABLE "announcements" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'General',
    "posted_by_id" VARCHAR(36) NOT NULL,
    "posted_by_department" VARCHAR(80) NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "target_audience" "AnnouncementAudience" NOT NULL DEFAULT 'All',
    "target_department" VARCHAR(80),
    "target_location" VARCHAR(120),
    "target_role" "UserRole",
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_published_at_idx" ON "announcements"("published_at");

-- CreateIndex
CREATE INDEX "announcements_is_pinned_published_at_idx" ON "announcements"("is_pinned", "published_at");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
