-- F35-1a: days before a term's start from which registration changes need approval; null = no approval.
ALTER TABLE "event" ADD COLUMN "changeApprovalDays" INTEGER;
ALTER TABLE "event" ADD CONSTRAINT "event_change_approval_days_chk" CHECK ("changeApprovalDays" IS NULL OR "changeApprovalDays" >= 0);
