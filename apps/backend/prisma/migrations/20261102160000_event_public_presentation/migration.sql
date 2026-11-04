-- F55: public presentation of an event on its catalog detail: conditions,
-- the public contact and photos kept in object storage.
-- AlterTable
ALTER TABLE "event" ADD COLUMN     "conditions" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "contactEmail" VARCHAR(320),
ADD COLUMN     "contactName" VARCHAR(200),
ADD COLUMN     "contactPhone" VARCHAR(20);

-- CreateTable
CREATE TABLE "event_photo" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "objectKey" VARCHAR(200) NOT NULL,
    "contentType" VARCHAR(50) NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_photo_objectKey_key" ON "event_photo"("objectKey");

-- CreateIndex
CREATE INDEX "event_photo_eventId_createdAt_idx" ON "event_photo"("eventId", "createdAt");

-- AddForeignKey
ALTER TABLE "event_photo" ADD CONSTRAINT "event_photo_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A public contact has a name and an e-mail; the phone is optional.
ALTER TABLE "event" ADD CONSTRAINT "event_contact_chk" CHECK (
  ("contactName" IS NULL) = ("contactEmail" IS NULL)
  AND ("contactPhone" IS NULL OR "contactName" IS NOT NULL)
);
ALTER TABLE "event_photo" ADD CONSTRAINT "event_photo_byte_size_chk" CHECK ("byteSize" > 0);
