-- CreateTable
CREATE TABLE "room_publication" (
    "termId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "publishedById" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_publication_pkey" PRIMARY KEY ("termId")
);

-- CreateIndex
CREATE INDEX "room_publication_publishedById_idx" ON "room_publication"("publishedById");

-- CreateIndex
CREATE UNIQUE INDEX "room_publication_termId_eventId_key" ON "room_publication"("termId", "eventId");

-- AddForeignKey
ALTER TABLE "room_publication" ADD CONSTRAINT "room_publication_termId_eventId_fkey" FOREIGN KEY ("termId", "eventId") REFERENCES "event_term"("id", "eventId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_publication" ADD CONSTRAINT "room_publication_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
