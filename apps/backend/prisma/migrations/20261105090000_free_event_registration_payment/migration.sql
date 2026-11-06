-- S3-C04: an event whose terms are all free opens without payment settings, so
-- its registrations snapshot none. Either the whole snapshot is present or none of it.
ALTER TABLE "registration"
  ALTER COLUMN "bankAccountNumber" DROP NOT NULL,
  ALTER COLUMN "bankCode" DROP NOT NULL,
  ALTER COLUMN "paymentReminderDays" DROP NOT NULL;

ALTER TABLE "registration"
  ADD CONSTRAINT "registration_payment_snapshot_chk" CHECK (
    ("bankAccountNumber" IS NULL AND "bankCode" IS NULL
      AND "paymentReminderDays" IS NULL AND "bankAccountPrefix" IS NULL)
    OR ("bankAccountNumber" IS NOT NULL AND "bankCode" IS NOT NULL
      AND "paymentReminderDays" IS NOT NULL)
  );
