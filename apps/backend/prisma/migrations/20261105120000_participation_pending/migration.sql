-- S3-01 (spec v4 §3): a new registration and a moved term wait for the
-- organizer's decision instead of being decided by capacity on saving.
-- Existing confirmed and waitlisted terms keep their status.
ALTER TYPE "participation_status" ADD VALUE 'pending' BEFORE 'confirmed';
