-- F64: voluntary gender answer for accommodation, stored per registration.
-- Existing registrations stay NULL ("Neuvedeno"); nothing is inferred.

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('female', 'male', 'other', 'undisclosed');

-- AlterTable
ALTER TABLE "registration" ADD COLUMN "gender" "gender";
