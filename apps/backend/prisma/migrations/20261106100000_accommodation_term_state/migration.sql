-- S3-01 (spec v4 §5): the evaluation mode of an event, the input version and
-- scheduling state of each term, and the version every run read.

-- CreateEnum
CREATE TYPE "accommodation_evaluation_mode" AS ENUM ('automatic', 'manual');

-- AlterTable
ALTER TABLE "event" ADD COLUMN "accommodationEvaluationMode" "accommodation_evaluation_mode" NOT NULL DEFAULT 'automatic';

-- AlterTable: runs stored before this read version 0, the version of a term
-- without a state row.
ALTER TABLE "accommodation_run" ADD COLUMN "inputVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "accommodation_run" ALTER COLUMN "inputVersion" DROP DEFAULT;
ALTER TABLE "accommodation_run" ADD CONSTRAINT "accommodation_run_input_version_chk" CHECK ("inputVersion" >= 0);

-- CreateTable
CREATE TABLE "accommodation_term_state" (
    "termId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "inputVersion" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMPTZ(3),
    "runningRunId" UUID,
    "runningVersion" INTEGER,
    "runningById" TEXT,
    "runningSince" TIMESTAMPTZ(3),
    "requestedById" TEXT,

    CONSTRAINT "accommodation_term_state_pkey" PRIMARY KEY ("termId"),
    CONSTRAINT "accommodation_term_state_version_chk" CHECK ("inputVersion" >= 0),
    -- A running evaluation has its run id, the version it read and a start;
    -- none of them without the others.
    CONSTRAINT "accommodation_term_state_running_chk" CHECK (
        ("runningRunId" IS NULL) = ("runningVersion" IS NULL)
        AND ("runningRunId" IS NULL) = ("runningSince" IS NULL)
        AND ("runningRunId" IS NOT NULL OR "runningById" IS NULL)
        AND ("runningVersion" IS NULL OR "runningVersion" <= "inputVersion")
    ),
    -- Only a scheduled evaluation has someone who asked for it.
    CONSTRAINT "accommodation_term_state_requested_chk" CHECK ("dueAt" IS NOT NULL OR "requestedById" IS NULL)
);

-- CreateIndex
CREATE INDEX "accommodation_term_state_dueAt_idx" ON "accommodation_term_state"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_term_state_termId_eventId_key" ON "accommodation_term_state"("termId", "eventId");

-- AddForeignKey
ALTER TABLE "accommodation_term_state" ADD CONSTRAINT "accommodation_term_state_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;
