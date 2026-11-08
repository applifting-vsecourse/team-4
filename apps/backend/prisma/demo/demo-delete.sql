-- akc.io demo data for Sprint Review 3 (S3-T5): removes the demo set.
--
-- Deletes the demo organizer (id akcio-demo-organizer, created by
-- demo-create.sql with the e-mail team4vse@seznam.cz), every organization they own and
-- everything under it (events, terms, rooms, programme, registrations,
-- payments, changes, evaluations, e-mail log), then the participant accounts
-- that are left without any registration. Nothing outside the demo
-- organizer's organizations is touched. Safe to run repeatedly; a database
-- without the demo set only prints a notice.
--
-- Run the whole file in one go (Adminer: SQL command). It is one statement,
-- so it either removes everything or nothing.

DO $$
DECLARE
  v_owner text;
  v_orgs uuid[];
  v_events uuid[];
  v_regs uuid[];
  v_accounts uuid[];
BEGIN
  -- By the fixed id, not the e-mail: the mailbox is shared, so another
  -- account with the same address must never be taken for the demo one.
  SELECT id INTO v_owner FROM "user" WHERE id = 'akcio-demo-organizer';
  IF v_owner IS NULL THEN
    RAISE NOTICE 'No demo organizer, nothing to delete.';
    RETURN;
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_orgs
    FROM organization WHERE "ownerId" = v_owner;
  SELECT coalesce(array_agg(id), '{}') INTO v_events
    FROM event WHERE "organizationId" = ANY (v_orgs);
  SELECT coalesce(array_agg(id), '{}') INTO v_regs
    FROM registration WHERE "eventId" = ANY (v_events);
  SELECT coalesce(array_agg(DISTINCT "participantAccountId"), '{}') INTO v_accounts
    FROM registration WHERE id = ANY (v_regs);

  -- Runs, interventions and participation decisions are immutable evidence
  -- in the product; the demo set is the one place where they go away with
  -- their event.
  ALTER TABLE accommodation_run DISABLE TRIGGER accommodation_run_immutable;
  ALTER TABLE accommodation_intervention DISABLE TRIGGER accommodation_intervention_immutable;
  ALTER TABLE accommodation_decision DISABLE TRIGGER accommodation_decision_immutable;
  DELETE FROM accommodation_run WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_intervention WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_decision WHERE "eventId" = ANY (v_events);
  ALTER TABLE accommodation_run ENABLE TRIGGER accommodation_run_immutable;
  ALTER TABLE accommodation_intervention ENABLE TRIGGER accommodation_intervention_immutable;
  ALTER TABLE accommodation_decision ENABLE TRIGGER accommodation_decision_immutable;
  DELETE FROM registration_result_event WHERE "eventId" = ANY (v_events);

  DELETE FROM accommodation_manual_value WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_term_state WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_term_order WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_rules WHERE "eventId" = ANY (v_events);

  DELETE FROM email_delivery WHERE "registrationId" = ANY (v_regs);
  DELETE FROM payment WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration_change WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration_term WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration WHERE id = ANY (v_regs);

  DELETE FROM programme_item WHERE "eventId" = ANY (v_events);
  DELETE FROM room_term_availability WHERE "eventId" = ANY (v_events);
  DELETE FROM room WHERE "eventId" = ANY (v_events);
  DELETE FROM event_photo WHERE "eventId" = ANY (v_events);
  DELETE FROM event_term WHERE "eventId" = ANY (v_events);
  DELETE FROM event WHERE id = ANY (v_events);

  DELETE FROM organization_member
    WHERE "organizationId" = ANY (v_orgs) OR "userId" = v_owner;
  DELETE FROM organization WHERE id = ANY (v_orgs);

  -- Participant accounts that still register elsewhere stay.
  SELECT coalesce(array_agg(a.id), '{}') INTO v_accounts
    FROM participant_account a
    WHERE a.id = ANY (v_accounts)
      AND NOT EXISTS (
        SELECT 1 FROM registration r WHERE r."participantAccountId" = a.id
      );
  DELETE FROM email_delivery WHERE "participantAccountId" = ANY (v_accounts);
  DELETE FROM participant_account WHERE id = ANY (v_accounts);

  -- Sessions and the credential account cascade with the user.
  DELETE FROM verification WHERE identifier LIKE 'reset-password:%'
    AND value = v_owner;
  DELETE FROM "user" WHERE id = v_owner;

  RAISE NOTICE 'Deleted the demo set: % organizations, % events, % registrations, % participant accounts.',
    cardinality(v_orgs), cardinality(v_events), cardinality(v_regs), cardinality(v_accounts);
END $$;
