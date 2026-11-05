-- F63: transport, diet and health needs, once per registration.

-- CreateEnum
CREATE TYPE "transport_choice" AS ENUM ('own', 'shared');

-- CreateEnum
CREATE TYPE "diet_choice" AS ENUM ('vegetarian', 'vegan', 'gluten_free', 'lactose_free');

-- AlterTable
ALTER TABLE "registration" ADD COLUMN     "diet" "diet_choice"[] DEFAULT ARRAY[]::"diet_choice"[],
ADD COLUMN     "dietNote" VARCHAR(500) NOT NULL DEFAULT '',
ADD COLUMN     "hasNoDietRestriction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "health" VARCHAR(2000) NOT NULL DEFAULT '',
ADD COLUMN     "transport" "transport_choice",
ADD COLUMN     "transportNote" VARCHAR(500) NOT NULL DEFAULT '';

-- "Bez omezení" is exclusive with the predefined diet choices.
ALTER TABLE "registration" ADD CONSTRAINT "registration_diet_exclusive_chk" CHECK (NOT ("hasNoDietRestriction" AND cardinality("diet") > 0));
