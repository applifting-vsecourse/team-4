-- Pairing of imported bank transactions with registrations (F24).

-- AlterEnum
ALTER TYPE "payment_source" ADD VALUE 'bank_transfer';

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "assignmentReason" VARCHAR(500),
ADD COLUMN     "bankTransactionId" UUID;

-- Enum values are compared as text below, because a value added in this
-- migration cannot be used as a literal before it is committed.

-- A paired transaction is a bank transfer and a bank transfer has its
-- transaction.
ALTER TABLE "payment" ADD CONSTRAINT "payment_bank_transfer_chk"
  CHECK (("source"::text = 'bank_transfer') = ("bankTransactionId" IS NOT NULL));

-- Who recorded the payment: the organizer for an entry by hand, nobody for a
-- QR link payment, and for a bank transfer the organizer exactly when it was
-- paired by hand, with a reason; one paired by its variable symbol has neither.
ALTER TABLE "payment" DROP CONSTRAINT "payment_recorded_by_chk";
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_chk" CHECK (
  ("source"::text = 'organizer' AND "recordedById" IS NOT NULL)
  OR ("source"::text = 'qr_link' AND "recordedById" IS NULL)
  OR ("source"::text = 'bank_transfer'
      AND ("recordedById" IS NOT NULL) = ("assignmentReason" IS NOT NULL))
);

-- A reason belongs to a manual pairing only and is never blank.
ALTER TABLE "payment" ADD CONSTRAINT "payment_assignment_reason_chk" CHECK (
  "assignmentReason" IS NULL
  OR ("source"::text = 'bank_transfer' AND length(btrim("assignmentReason")) > 0)
);

-- CreateIndex: a transaction is credited at most once.
CREATE UNIQUE INDEX "payment_bankTransactionId_key" ON "payment"("bankTransactionId");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "bank_transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
