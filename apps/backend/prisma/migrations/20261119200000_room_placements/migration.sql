-- CreateTable
CREATE TABLE "room_placement" (
    "registrationId" UUID NOT NULL,
    "termId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "confirmedWarnings" VARCHAR(32)[] DEFAULT ARRAY[]::VARCHAR(32)[],
    "placedById" TEXT NOT NULL,
    "placedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_placement_pkey" PRIMARY KEY ("registrationId","termId")
);

-- CreateIndex
CREATE INDEX "room_placement_termId_roomId_idx" ON "room_placement"("termId", "roomId");

-- CreateIndex
CREATE INDEX "room_placement_roomId_idx" ON "room_placement"("roomId");

-- CreateIndex
CREATE INDEX "room_placement_placedById_idx" ON "room_placement"("placedById");

-- AddForeignKey
ALTER TABLE "room_placement" ADD CONSTRAINT "room_placement_registrationId_termId_fkey" FOREIGN KEY ("registrationId", "termId") REFERENCES "registration_term"("registrationId", "termId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_placement" ADD CONSTRAINT "room_placement_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_placement" ADD CONSTRAINT "room_placement_roomId_eventId_fkey" FOREIGN KEY ("roomId", "eventId") REFERENCES "room"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_placement" ADD CONSTRAINT "room_placement_placedById_fkey" FOREIGN KEY ("placedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Only the warnings an organizer can confirm (F14-2, #337).
ALTER TABLE "room_placement" ADD CONSTRAINT "room_placement_confirmed_warnings_chk"
  CHECK ("confirmedWarnings" <@ ARRAY['mixed', 'extra_bed', 'over_capacity']::VARCHAR(32)[]);
