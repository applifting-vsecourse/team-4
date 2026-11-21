-- S4-05 (#339): roommate wishes, one-sided and for the whole event.

-- CreateTable
CREATE TABLE "roommate_wish" (
    "eventId" UUID NOT NULL,
    "fromRegistrationId" UUID NOT NULL,
    "toRegistrationId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roommate_wish_pkey" PRIMARY KEY ("fromRegistrationId","toRegistrationId")
);

-- CreateIndex
CREATE INDEX "roommate_wish_eventId_idx" ON "roommate_wish"("eventId");

-- CreateIndex
CREATE INDEX "roommate_wish_toRegistrationId_idx" ON "roommate_wish"("toRegistrationId");

-- AddForeignKey
ALTER TABLE "roommate_wish" ADD CONSTRAINT "roommate_wish_fromRegistrationId_eventId_fkey" FOREIGN KEY ("fromRegistrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roommate_wish" ADD CONSTRAINT "roommate_wish_toRegistrationId_eventId_fkey" FOREIGN KEY ("toRegistrationId", "eventId") REFERENCES "registration"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Nobody wishes to room with themselves.
ALTER TABLE "roommate_wish"
  ADD CONSTRAINT "roommate_wish_not_self_chk" CHECK ("fromRegistrationId" <> "toRegistrationId");
