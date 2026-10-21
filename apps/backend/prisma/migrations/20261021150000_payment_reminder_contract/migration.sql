-- #138: the configured period and stored date describe a payment reminder,
-- not a payment deadline. Rename in place: do not recalculate old snapshots.
BEGIN;

ALTER TABLE "event" RENAME COLUMN "paymentDueDays" TO "paymentReminderDays";
ALTER TABLE "registration" RENAME COLUMN "paymentDueDays" TO "paymentReminderDays";
ALTER TABLE "registration" RENAME COLUMN "paymentDueAt" TO "paymentReminderAt";

ALTER TABLE "event" RENAME CONSTRAINT "event_due_days_chk" TO "event_reminder_days_chk";
ALTER TABLE "registration" RENAME CONSTRAINT "registration_due_days_chk" TO "registration_reminder_days_chk";

COMMIT;
