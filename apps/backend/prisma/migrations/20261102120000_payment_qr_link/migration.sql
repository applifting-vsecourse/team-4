-- F21-1: payment through a QR link. The link is an unguessable per-registration
-- token; a payment made through it has no recording user.
ALTER TABLE "registration"
  ADD COLUMN "paymentToken" VARCHAR(64) NOT NULL
  DEFAULT replace((gen_random_uuid())::text || (gen_random_uuid())::text, '-', '');
CREATE UNIQUE INDEX "registration_paymentToken_key" ON "registration"("paymentToken");

CREATE TYPE "payment_source" AS ENUM ('organizer', 'qr_link');
ALTER TABLE "payment" ADD COLUMN "source" "payment_source" NOT NULL DEFAULT 'organizer';
ALTER TABLE "payment" ALTER COLUMN "recordedById" DROP NOT NULL;
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_chk"
  CHECK (("source" = 'organizer') = ("recordedById" IS NOT NULL));
