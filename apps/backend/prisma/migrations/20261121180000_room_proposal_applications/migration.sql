-- "Použít návrh" (#365, phase-2 spec §7.2): an immutable record of each apply
-- of a room proposal to the saved placements, keyed per attempt.

-- CreateTable
CREATE TABLE "accommodation_proposal_application" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "proposalId" UUID NOT NULL,
    "submissionKey" UUID NOT NULL,
    "actorId" TEXT NOT NULL,
    "added" INTEGER NOT NULL,
    "moved" INTEGER NOT NULL,
    "removed" INTEGER NOT NULL,
    "layoutVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accommodation_proposal_application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accommodation_proposal_application_proposalId_idx" ON "accommodation_proposal_application"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_proposal_application_termId_submissionKey_key" ON "accommodation_proposal_application"("termId", "submissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "accommodation_room_proposal_id_termId_key" ON "accommodation_room_proposal"("id", "termId");

-- AddForeignKey
ALTER TABLE "accommodation_proposal_application" ADD CONSTRAINT "accommodation_proposal_application_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_proposal_application" ADD CONSTRAINT "accommodation_proposal_application_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_proposal_application" ADD CONSTRAINT "accommodation_proposal_application_proposalId_termId_fkey" FOREIGN KEY ("proposalId", "termId") REFERENCES "accommodation_room_proposal"("id", "termId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accommodation_proposal_application" ADD CONSTRAINT "accommodation_proposal_application_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Counts are never negative, and an apply always moves the layout version on.
ALTER TABLE "accommodation_proposal_application"
  ADD CONSTRAINT "accommodation_proposal_application_counts_chk" CHECK ("added" >= 0 AND "moved" >= 0 AND "removed" >= 0),
  ADD CONSTRAINT "accommodation_proposal_application_layout_version_chk" CHECK ("layoutVersion" >= 1);

-- The evidence of who applied what (§7.3): never changed or removed.
CREATE TRIGGER "accommodation_proposal_application_immutable" BEFORE UPDATE OR DELETE ON "accommodation_proposal_application"
  FOR EACH ROW EXECUTE FUNCTION "accommodation_immutable"();
