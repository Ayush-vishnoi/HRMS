-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Medium', 'High');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('To Do', 'In Progress', 'Done');

-- CreateTable
CREATE TABLE "tasks" (
    "id" VARCHAR(36) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "assigned_to_id" VARCHAR(36) NOT NULL,
    "assigned_by_id" VARCHAR(36),
    "due_date" DATE,
    "priority" "TaskPriority" NOT NULL DEFAULT 'Medium',
    "status" "TaskStatus" NOT NULL DEFAULT 'To Do',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_tasks_assignee_status" ON "tasks"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "idx_tasks_assigner" ON "tasks"("assigned_by_id");

-- CreateIndex
CREATE INDEX "idx_tasks_due_date" ON "tasks"("due_date");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
