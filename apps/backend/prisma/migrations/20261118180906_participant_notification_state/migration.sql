-- What a participant did with a portal notification (S4-06). The notifications
-- are read from saved decisions, decided change requests and payments; this
-- table only keeps whether one was opened or dismissed. No row: unread.
CREATE TABLE "participant_notification_state" (
    "participantAccountId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "readAt" TIMESTAMPTZ(3),
    "dismissedAt" TIMESTAMPTZ(3),

    CONSTRAINT "participant_notification_state_pkey" PRIMARY KEY ("participantAccountId","sourceId"),
    -- A dismissed notification also counts as read.
    CONSTRAINT "participant_notification_state_dismissed_read_check" CHECK ("dismissedAt" IS NULL OR "readAt" IS NOT NULL)
);

-- AddForeignKey
ALTER TABLE "participant_notification_state" ADD CONSTRAINT "participant_notification_state_participantAccountId_fkey" FOREIGN KEY ("participantAccountId") REFERENCES "participant_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
