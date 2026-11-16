-- Room proposals (phase 2, #365, spec §7): their own queue on the term state,
-- a layout version beside the evaluation version, and immutable records.

-- CreateEnum
CREATE TYPE "accommodation_proposal_status" AS ENUM ('solved', 'timeout', 'failed');

-- AlterTable
ALTER TABLE "accommodation_term_state" ADD COLUMN     "layoutVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "proposalDueAt" TIMESTAMPTZ(3),
ADD COLUMN     "proposalRequestedById" TEXT,
ADD COLUMN     "proposalRunningById" TEXT,
ADD COLUMN     "proposalRunningId" UUID,
ADD COLUMN     "proposalRunningSince" TIMESTAMPTZ(3),
ADD COLUMN     "proposalRunningVersion" INTEGER;

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "isRoomProposalAutomatic" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "accommodation_room_proposal" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "status" "accommodation_proposal_status" NOT NULL,
    "triggeredById" TEXT,
    "solverVersion" VARCHAR(64) NOT NULL,
    "input" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "layoutVersion" INTEGER NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "finishedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accommodation_room_proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accommodation_room_proposal_termId_startedAt_idx" ON "accommodation_room_proposal"("termId", "startedAt");

-- CreateIndex
CREATE INDEX "accommodation_term_state_proposalDueAt_idx" ON "accommodation_term_state"("proposalDueAt");

-- AddForeignKey
ALTER TABLE "accommodation_room_proposal" ADD CONSTRAINT "accommodation_room_proposal_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_room_proposal" ADD CONSTRAINT "accommodation_room_proposal_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_room_proposal" ADD CONSTRAINT "accommodation_room_proposal_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A running proposal has its id, the version it read and a start; none of
-- them without the others. Only a scheduled one has someone who asked for it.
ALTER TABLE "accommodation_term_state"
  ADD CONSTRAINT "accommodation_term_state_layout_version_chk" CHECK ("layoutVersion" >= 0),
  ADD CONSTRAINT "accommodation_term_state_proposal_running_chk" CHECK (
    ("proposalRunningId" IS NULL) = ("proposalRunningVersion" IS NULL)
    AND ("proposalRunningId" IS NULL) = ("proposalRunningSince" IS NULL)
    AND ("proposalRunningId" IS NOT NULL OR "proposalRunningById" IS NULL)
    AND ("proposalRunningVersion" IS NULL OR "proposalRunningVersion" <= "layoutVersion")
  ),
  ADD CONSTRAINT "accommodation_term_state_proposal_requested_chk" CHECK ("proposalDueAt" IS NOT NULL OR "proposalRequestedById" IS NULL);

-- A proposal has a result unless it failed, and a failed one says why.
ALTER TABLE "accommodation_room_proposal"
  ADD CONSTRAINT "accommodation_room_proposal_result_chk" CHECK (("status" = 'failed') = ("result" IS NULL) AND ("status" = 'failed') = ("error" IS NOT NULL)),
  ADD CONSTRAINT "accommodation_room_proposal_time_chk" CHECK ("finishedAt" >= "startedAt"),
  ADD CONSTRAINT "accommodation_room_proposal_layout_version_chk" CHECK ("layoutVersion" >= 0);

-- Proposals are the evidence of a layout (§7.3): never changed or removed.
CREATE TRIGGER "accommodation_room_proposal_immutable" BEFORE UPDATE OR DELETE ON "accommodation_room_proposal"
  FOR EACH ROW EXECUTE FUNCTION "accommodation_immutable"();
