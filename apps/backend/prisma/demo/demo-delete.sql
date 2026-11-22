-- akc.io demo data for Sprint Review 4 (S4-T08): removes the demo set.
--
-- Deletes the demo organizer (id akcio-demo-s4-organizer, created by
-- demo-create.sql with the e-mail team4vse@seznam.cz), every organization
-- they own and everything under it, then the participant accounts that are
-- left without any registration. Everything the demo may have added on the
-- way goes too: new registrations, imported statements, room proposals,
-- placements, decisions, changes, photos, e-mails. Nothing outside the demo
-- organizer's organizations is touched. Safe to run repeatedly; a database
-- without the demo set only prints a notice.
--
-- Run the whole file in one go (Adminer: SQL command). It runs in one
-- transaction, so it either removes everything or nothing.

BEGIN;

-- ─── Removes everything a demo organizer owns (same in demo-create.sql) ─────
-- A session-local function (pg_temp), gone when the connection closes.

CREATE OR REPLACE FUNCTION pg_temp.demo_remove_owner(p_owner text)
RETURNS text LANGUAGE plpgsql AS $fn$
DECLARE
  v_orgs uuid[];
  v_events uuid[];
  v_regs uuid[];
  v_accounts uuid[];
BEGIN
  -- By the fixed id, not the e-mail: the mailbox is shared, so another
  -- account with the same address is never taken for the demo one.
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = p_owner) THEN
    RETURN NULL;
  END IF;

  SELECT coalesce(array_agg(id), '{}') INTO v_orgs
    FROM organization WHERE "ownerId" = p_owner;
  SELECT coalesce(array_agg(id), '{}') INTO v_events
    FROM event WHERE "organizationId" = ANY (v_orgs);
  SELECT coalesce(array_agg(id), '{}') INTO v_regs
    FROM registration WHERE "organizationId" = ANY (v_orgs);
  SELECT coalesce(array_agg(DISTINCT "participantAccountId"), '{}') INTO v_accounts
    FROM registration WHERE id = ANY (v_regs);

  -- Evaluations, room proposals and their applications, interventions and
  -- participation decisions are immutable evidence in the product; the demo
  -- set is the one place where they go away with their event.
  ALTER TABLE accommodation_proposal_application DISABLE TRIGGER accommodation_proposal_application_immutable;
  ALTER TABLE accommodation_room_proposal DISABLE TRIGGER accommodation_room_proposal_immutable;
  ALTER TABLE accommodation_run DISABLE TRIGGER accommodation_run_immutable;
  ALTER TABLE accommodation_intervention DISABLE TRIGGER accommodation_intervention_immutable;
  ALTER TABLE accommodation_decision DISABLE TRIGGER accommodation_decision_immutable;
  DELETE FROM accommodation_proposal_application WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_room_proposal WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_run WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_intervention WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_decision WHERE "eventId" = ANY (v_events);
  ALTER TABLE accommodation_proposal_application ENABLE TRIGGER accommodation_proposal_application_immutable;
  ALTER TABLE accommodation_room_proposal ENABLE TRIGGER accommodation_room_proposal_immutable;
  ALTER TABLE accommodation_run ENABLE TRIGGER accommodation_run_immutable;
  ALTER TABLE accommodation_intervention ENABLE TRIGGER accommodation_intervention_immutable;
  ALTER TABLE accommodation_decision ENABLE TRIGGER accommodation_decision_immutable;

  DELETE FROM registration_result_event WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_manual_value WHERE "eventId" = ANY (v_events);
  DELETE FROM accommodation_rules WHERE "eventId" = ANY (v_events);
  DELETE FROM room_publication WHERE "eventId" = ANY (v_events);
  DELETE FROM room_placement WHERE "eventId" = ANY (v_events);
  DELETE FROM roommate_wish WHERE "eventId" = ANY (v_events);

  DELETE FROM email_delivery WHERE "registrationId" = ANY (v_regs);
  DELETE FROM payment WHERE "organizationId" = ANY (v_orgs);
  DELETE FROM bank_transaction WHERE "organizationId" = ANY (v_orgs);
  DELETE FROM registration_change WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration_term WHERE "registrationId" = ANY (v_regs);
  DELETE FROM registration WHERE id = ANY (v_regs);

  -- Programme items, room availability, placements, publications, term
  -- states and orders cascade with their term or room.
  DELETE FROM room WHERE "eventId" = ANY (v_events);
  DELETE FROM event_photo WHERE "eventId" = ANY (v_events);
  DELETE FROM programme_item WHERE "eventId" = ANY (v_events);
  DELETE FROM event_term WHERE "eventId" = ANY (v_events);
  DELETE FROM event WHERE id = ANY (v_events);

  DELETE FROM organization_member
    WHERE "organizationId" = ANY (v_orgs) OR "userId" = p_owner;
  DELETE FROM organization WHERE id = ANY (v_orgs);

  -- Participant accounts that still register elsewhere stay. Magic links,
  -- sessions and notification states cascade with the account.
  SELECT coalesce(array_agg(a.id), '{}') INTO v_accounts
    FROM participant_account a
    WHERE a.id = ANY (v_accounts)
      AND NOT EXISTS (
        SELECT 1 FROM registration r WHERE r."participantAccountId" = a.id
      );
  DELETE FROM email_delivery WHERE "participantAccountId" = ANY (v_accounts);
  DELETE FROM participant_account WHERE id = ANY (v_accounts);

  -- Sessions and the credential account cascade with the user.
  DELETE FROM verification WHERE value = p_owner;
  DELETE FROM "user" WHERE id = p_owner;

  RETURN format('%s organizations, %s events, %s registrations, %s participant accounts',
    cardinality(v_orgs), cardinality(v_events), cardinality(v_regs), cardinality(v_accounts));
END $fn$;

DO $$
DECLARE
  v_removed text := pg_temp.demo_remove_owner('akcio-demo-s4-organizer');
BEGIN
  IF v_removed IS NULL THEN
    RAISE NOTICE 'No Sprint 4 demo organizer, nothing to delete.';
  ELSE
    RAISE NOTICE 'Deleted the Sprint 4 demo set: %.', v_removed;
  END IF;
END $$;

COMMIT;
