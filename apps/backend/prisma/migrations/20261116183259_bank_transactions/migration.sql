-- Received transactions of imported bank statements (F23).

-- CreateTable
CREATE TABLE "bank_transaction" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "bankTransactionId" VARCHAR(40) NOT NULL,
    "bookedOn" DATE NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "variableSymbol" VARCHAR(10),
    "counterpartyAccount" VARCHAR(60),
    "counterpartyName" VARCHAR(200),
    "message" VARCHAR(500),
    "importedById" TEXT NOT NULL,
    "importedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transaction_pkey" PRIMARY KEY ("id"),
    -- Only incoming movements are stored.
    CONSTRAINT "bank_transaction_amount_chk" CHECK ("amountMinor" > 0),
    CONSTRAINT "bank_transaction_variable_symbol_chk" CHECK ("variableSymbol" IS NULL OR "variableSymbol" ~ '^[0-9]{1,10}$'),
    CONSTRAINT "bank_transaction_bank_id_chk" CHECK (length(btrim("bankTransactionId")) > 0)
);

-- CreateIndex
CREATE INDEX "bank_transaction_eventId_bookedOn_idx" ON "bank_transaction"("eventId", "bookedOn");

-- CreateIndex: the same movement imported again into the event is skipped.
CREATE UNIQUE INDEX "bank_transaction_eventId_bankTransactionId_key" ON "bank_transaction"("eventId", "bankTransactionId");

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_eventId_organizationId_fkey" FOREIGN KEY ("eventId", "organizationId") REFERENCES "event"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
