-- akc.io demo data for Sprint Review 4 (S4-T08): creates or resets the demo set.
--
-- Run the whole file in one go (Adminer: SQL command). It first removes any
-- previous demo set (the same function as demo-delete.sql), then creates it
-- again, all in one transaction: every run starts the demo from the same
-- state, whatever was done during the last demo, and a failure leaves the
-- database as it was. Dates are relative to D, the local date in
-- Europe/Prague at the time of the run.
--
-- Organizer: Marek Pořadatel, team4vse@seznam.cz / akcio-demo-2026
-- Participant with a mailbox (magic link): Adam Král, team4vse@seznam.cz
-- Everyone else is fictional (@example.com), cannot sign in and gets no e-mail.
-- The Fio statement fio-vypis-tabor-dve-platby.csv pays Adam's camp balance
-- through the fixed variable symbol and leaves Eliška's payment unmatched.

BEGIN;

-- ─── 1. Removes everything a demo organizer owns (same in demo-delete.sql) ──
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

-- ─── 2. Remove the previous demo sets ───────────────────────────────────────

DO $$
DECLARE
  v_removed text;
BEGIN
  -- The mailbox is shared: an account with the same e-mail that the demo
  -- did not create is never deleted; the run stops instead.
  IF EXISTS (
    SELECT 1 FROM "user"
    WHERE lower(email) = 'team4vse@seznam.cz'
      AND id NOT IN ('akcio-demo-organizer', 'akcio-demo-s4-organizer')
  ) THEN
    RAISE EXCEPTION 'team4vse@seznam.cz belongs to an account the demo did not create; nothing was changed.';
  END IF;

  -- One-off: the Sprint Review 3 set (organizer akcio-demo-organizer) is
  -- retired. Remove this call once it is gone from production.
  v_removed := pg_temp.demo_remove_owner('akcio-demo-organizer');
  IF v_removed IS NOT NULL THEN
    RAISE NOTICE 'Removed the Sprint 3 demo set: %.', v_removed;
  END IF;

  v_removed := pg_temp.demo_remove_owner('akcio-demo-s4-organizer');
  IF v_removed IS NOT NULL THEN
    RAISE NOTICE 'Removed the previous Sprint 4 demo set: %.', v_removed;
  END IF;

  -- Never a reason to stop the reset, but Adam's "Moje přihlášky" would show
  -- these registrations too.
  IF EXISTS (
    SELECT 1 FROM registration r
    JOIN participant_account a ON a.id = r."participantAccountId"
    WHERE a.email = 'team4vse@seznam.cz'
  ) THEN
    RAISE NOTICE 'team4vse@seznam.cz still has registrations outside the demo; Adam will see them in Moje přihlášky.';
  END IF;
END $$;

-- ─── 3. Helper: one registration with its terms and payments ────────────────

CREATE OR REPLACE FUNCTION pg_temp.demo_registration(
  p_event uuid,
  p_first text,
  p_last text,
  p_email text,
  p_phone text,
  p_gender gender,
  p_received timestamptz,
  p_terms jsonb,              -- {"<termId>": "confirmed" | "pending" | "waitlisted"}
  p_payments int[] DEFAULT '{}',
  p_variable_symbol text DEFAULT NULL  -- NULL: the next one of the sequence
) RETURNS uuid LANGUAGE plpgsql AS $fn$
DECLARE
  v_id uuid := gen_random_uuid();
  v_ev event%ROWTYPE;
  v_owner text;
  v_account uuid;
  v_due int;
  v_has_bank boolean;
  v_i int;
  v_today date := (now() AT TIME ZONE 'Europe/Prague')::date;
BEGIN
  SELECT * INTO v_ev FROM event WHERE id = p_event;
  SELECT "ownerId" INTO v_owner FROM organization WHERE id = v_ev."organizationId";
  v_has_bank := v_ev."bankAccountNumber" IS NOT NULL;

  INSERT INTO participant_account (id, email)
    VALUES (gen_random_uuid(), lower(p_email))
    ON CONFLICT (email) DO NOTHING;
  SELECT id INTO v_account FROM participant_account WHERE email = lower(p_email);

  SELECT coalesce(sum(t."priceMinor"), 0) INTO v_due
    FROM jsonb_each_text(p_terms) j
    JOIN event_term t ON t.id = j.key::uuid
    WHERE j.value = 'confirmed';

  INSERT INTO registration (
    id, "organizationId", "eventId", "participantAccountId", "submissionKey",
    "payloadHash", "variableSymbol", "firstName", "lastName", email, phone, gender,
    "receivedAt", "paymentReminderAt", "hasNoDietRestriction",
    "bankAccountPrefix", "bankAccountNumber", "bankCode", "paymentReminderDays"
  ) VALUES (
    v_id, v_ev."organizationId", p_event, v_account, gen_random_uuid(),
    encode(sha256(convert_to(v_id::text, 'UTF8')), 'hex'),
    coalesce(p_variable_symbol, nextval('registration_variable_symbol_seq')::text),
    p_first, p_last, p_email, p_phone, p_gender, p_received,
    CASE WHEN v_has_bank AND v_due > 0
      THEN p_received + make_interval(days => v_ev."paymentReminderDays") END,
    true,
    v_ev."bankAccountPrefix", v_ev."bankAccountNumber", v_ev."bankCode",
    CASE WHEN v_has_bank THEN v_ev."paymentReminderDays" END
  );

  INSERT INTO registration_term
    ("registrationId", "termId", "eventId", status, "priceMinor", "decidedAt")
  SELECT v_id, t.id, p_event, j.value::participation_status, t."priceMinor", p_received
    FROM jsonb_each_text(p_terms) j
    JOIN event_term t ON t.id = j.key::uuid;

  FOR v_i IN 1 .. coalesce(array_length(p_payments, 1), 0) LOOP
    INSERT INTO payment (
      id, "organizationId", "registrationId", "submissionKey", "amountMinor",
      "receivedOn", source, "recordedById", "createdAt"
    ) VALUES (
      gen_random_uuid(), v_ev."organizationId", v_id, gen_random_uuid(),
      p_payments[v_i], least((p_received + make_interval(days => 3 * v_i))::date, v_today),
      'organizer', v_owner, least(p_received + make_interval(days => 3 * v_i), now())
    );
  END LOOP;

  RETURN v_id;
END $fn$;

-- ─── 4. The demo set ─────────────────────────────────────────────────────────

DO $$
DECLARE
  d date := (now() AT TIME ZONE 'Europe/Prague')::date;
  now_ts timestamptz := now();
  v_owner text := 'akcio-demo-s4-organizer';
  v_org uuid := gen_random_uuid();

  -- Events
  e_trip uuid := gen_random_uuid();
  e_week uuid := gen_random_uuid();
  e_course uuid := gen_random_uuid();
  e_camp uuid := gen_random_uuid();

  -- Terms
  t_trip uuid := gen_random_uuid();
  t_week uuid := gen_random_uuid();
  t_course1 uuid := gen_random_uuid();
  t_course2 uuid := gen_random_uuid();
  t_camp1 uuid := gen_random_uuid();
  t_camp2 uuid := gen_random_uuid();

  -- Rooms
  r_bus uuid := gen_random_uuid();
  r_base uuid := gen_random_uuid();
  r_classroom uuid := gen_random_uuid();
  r_buk uuid := gen_random_uuid();
  r_javor uuid := gen_random_uuid();
  r_attic uuid := gen_random_uuid();

  -- Camp registrations
  reg_adam uuid;
  reg_david uuid;
  reg_filip uuid;
  reg_eliska uuid;
  reg_tereza uuid;
  reg_petr uuid;
  reg_lukas uuid;

  v_terms jsonb;
BEGIN
  -- ── Organizer and organization ──
  INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
    VALUES (v_owner, 'Marek Pořadatel', 'team4vse@seznam.cz', true, now_ts, now_ts);
  -- BetterAuth credential account; password akcio-demo-2026 (scrypt).
  INSERT INTO account (id, "accountId", "providerId", issuer, "userId", password, "createdAt", "updatedAt")
    VALUES ('akcio-demo-s4-organizer-credential', v_owner, 'credential', 'local:credential', v_owner,
      '30cd69e654286678fd6bf676d54ad723:79ff45534b1bc181e1b2399b4105719e77ac4e72930e2aedae210d913630f7a2e9892b4de3b2bbc14cc77cb6e5d0b64055e0b7219be2eb0f7a4ea26698351726',
      now_ts, now_ts);
  INSERT INTO organization (id, name, "ownerId", "updatedAt")
    VALUES (v_org, 'Spolek Lípa', v_owner, now_ts);
  INSERT INTO organization_member ("organizationId", "userId", role)
    VALUES (v_org, v_owner, 'owner');

  -- ── Adam's participant account with a saved profile ──
  -- It prefills a new registration together with the verified e-mail.
  INSERT INTO participant_account (id, email, "firstName", "lastName", phone)
    VALUES (gen_random_uuid(), 'team4vse@seznam.cz', 'Adam', 'Král', '+420601000001')
    ON CONFLICT (email) DO UPDATE
      SET "firstName" = 'Adam', "lastName" = 'Král', phone = '+420601000001';

  -- ── Events ──
  -- 1. Past paid one-day trip, Adam's registration paid.
  -- 2. Ongoing free volunteer week, registration closed, Adam confirmed.
  -- 3. Paid course, registration open, two one-day terms with different prices.
  -- 4. Paid camp, two terms, gender-separated rooms and two distinct proposal demos.
  INSERT INTO event (
    id, "organizationId", "publicId", name, description, location, status,
    "firstOpenedAt", "isPublished", "bankAccountNumber", "bankCode",
    "paymentReminderDays", "changeApprovalDays", "isRoomProposalAutomatic",
    conditions, "contactName", "contactEmail", "contactPhone", "createdAt", "updatedAt"
  ) VALUES
  (
    e_trip, v_org, 'lipa-snezka', 'Výstup na Sněžku',
    'Jednodenní výlet z Pece pod Sněžkou přes Obří důl na vrchol a zpět. Doprava společným autobusem z Prahy.',
    'Krkonoše', 'closed', now_ts - interval '45 days', true,
    '2001234567', '2010', 14, 3, false,
    'Přihláška je závazná po potvrzení účasti. Storno do 7 dnů před výletem bez poplatku, později vracíme polovinu ceny.',
    'Marek Pořadatel', 'team4vse@seznam.cz', '+420601234567',
    now_ts - interval '50 days', now_ts
  ),
  (
    e_week, v_org, 'lipa-tyden', 'Dobrovolnický týden v Kunratickém lese',
    'Týden dobrovolnické práce v Kunratickém lese: úklid potoka, výsadba stromků a údržba stezek. Nářadí, rukavice a pytle zajistíme, každý den společný oběd.',
    'Praha', 'closed', now_ts - interval '30 days', true,
    NULL, NULL, NULL, NULL, false,
    'Akce je zdarma. Pokud nemůžete přijít, odhlaste se prosím co nejdřív, ať místo může dostat někdo jiný.',
    'Marek Pořadatel', 'team4vse@seznam.cz', '+420601234567',
    now_ts - interval '35 days', now_ts
  ),
  (
    e_course, v_org, 'lipa-kurz', 'Kurz první pomoci',
    'Jednodenní praktický kurz první pomoci s certifikovaným lektorem: resuscitace, zástava krvácení, úrazy v přírodě a modelové situace. Rozšířený kurz přidává práci s AED a hromadná neštěstí.',
    'Liberec', 'open', now_ts - interval '20 days', true,
    '2001234567', '2010', 7, 3, false,
    'Kurz je vhodný i pro úplné začátečníky. Na konci obdržíte osvědčení o absolvování. Storno do 3 dnů před kurzem bez poplatku, později cenu nevracíme, ale můžete poslat náhradníka.',
    'Marek Pořadatel', 'team4vse@seznam.cz', '+420601234567',
    now_ts - interval '25 days', now_ts
  ),
  (
    e_camp, v_org, 'lipa-tabor', 'Tábor v Jizerkách',
    'Týden v horách pro dospělé: denní výlety po hřebenech, hry v lese, večery u ohně a společné vaření. Bydlíme v dřevěných chatkách, pokoje jsou rozdělené podle pohlaví.',
    'Jizerské hory', 'open', now_ts - interval '40 days', true,
    '2001234567', '2010', 14, 3, false,
    'Přihláška je závazná po potvrzení účasti organizátorem. Storno do 14 dnů před začátkem turnusu bez poplatku, později vracíme polovinu ceny.',
    'Marek Pořadatel', 'team4vse@seznam.cz', '+420601234567',
    now_ts - interval '45 days', now_ts
  );

  -- ── Terms ──
  INSERT INTO event_term (id, "eventId", label, "startDate", "endDate", "priceMinor", "updatedAt") VALUES
    (t_trip, e_trip, 'Jednodenní výstup', d - 14, d - 14, 45000, now_ts),
    (t_week, e_week, 'Dobrovolnický týden', d - 3, d + 3, 0, now_ts),
    (t_course1, e_course, 'Základní kurz', d + 4, d + 4, 65000, now_ts),
    (t_course2, e_course, 'Rozšířený kurz', d + 17, d + 17, 85000, now_ts),
    (t_camp1, e_camp, '1. turnus', d + 7, d + 13, 450000, now_ts),
    (t_camp2, e_camp, '2. turnus', d + 21, d + 27, 450000, now_ts);

  -- ── Rooms and their beds per term ──
  INSERT INTO room (id, "eventId", label, "updatedAt") VALUES
    (r_bus, e_trip, 'Autobus', now_ts),
    (r_base, e_week, 'Základna', now_ts),
    (r_classroom, e_course, 'Učebna', now_ts),
    (r_buk, e_camp, 'Chatka Buk', now_ts),
    (r_javor, e_camp, 'Chatka Javor', now_ts),
    (r_attic, e_camp, 'Podkroví hlavní budovy', now_ts);
  INSERT INTO room_term_availability ("roomId", "termId", "eventId", "isAvailable", "baseBeds", "extraBeds") VALUES
    (r_bus, t_trip, e_trip, true, 20, 0),
    (r_base, t_week, e_week, true, 12, 0),
    (r_classroom, t_course1, e_course, true, 12, 0),
    (r_classroom, t_course2, e_course, true, 12, 0),
    (r_buk, t_camp1, e_camp, true, 2, 0),
    (r_javor, t_camp1, e_camp, true, 2, 0),
    (r_attic, t_camp1, e_camp, true, 1, 0),
    (r_buk, t_camp2, e_camp, true, 8, 0),
    (r_javor, t_camp2, e_camp, true, 2, 0),
    (r_attic, t_camp2, e_camp, false, 1, 0);

  -- Camp rooms are separated by gender (hard rule); other and undisclosed
  -- answers leave the room to the organizer. Roommate wishes are the soft
  -- preference of the room proposal.
  INSERT INTO accommodation_rules ("eventId", "hardAttribute", "nonDeterminingValues", "softAttributes", "updatedAt")
    VALUES (e_camp, 'gender', ARRAY['other', 'undisclosed'], ARRAY['roommate-wishes'], now_ts);

  -- ── Programme (visible to confirmed participants) ──
  INSERT INTO programme_item (id, "eventId", "termId", title, "startDate", "startTime", "endTime", place, description, "updatedAt") VALUES
    (gen_random_uuid(), e_week, t_week, 'Zahájení a rozdělení do skupin', d - 3, '09:00', '10:00', 'Hájovna Kunratice', 'Rukavice a nářadí vydáváme na místě.', now_ts),
    (gen_random_uuid(), e_week, t_week, 'Úklid Kunratického potoka', d - 1, '09:00', '13:00', 'Sraz u hájovny', NULL, now_ts),
    (gen_random_uuid(), e_week, t_week, 'Výsadba stromků', d, '09:00', '13:00', 'Paseka u Šeberáku', 'S sebou pevnou obuv a láhev s vodou.', now_ts),
    (gen_random_uuid(), e_week, t_week, 'Opékání a zakončení', d + 3, '16:00', '19:00', 'Ohniště u hájovny', NULL, now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Příjezd a ubytování', d + 7, '15:00', '17:00', 'Recepce osady', 'Klíče od chatek vydáváme do 19:00.', now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Večeře a seznámení', d + 7, '18:30', '20:00', 'Jídelna', NULL, now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Výlet na Bukovec', d + 8, '09:00', '16:00', 'Sraz před jídelnou', 'Celodenní túra, 14 km. S sebou svačinu a pláštěnku.', now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Hry v lese', d + 9, '10:00', '12:00', 'Louka za osadou', NULL, now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Večer u ohně', d + 10, '19:30', '22:00', 'Ohniště', 'Kytary vítány.', now_ts),
    (gen_random_uuid(), e_camp, t_camp1, 'Odjezd', d + 13, '09:00', '10:00', 'Recepce osady', 'Chatky prosíme vyklidit do 10:00.', now_ts);

  -- ── Trip (past): settled, Adam paid ──
  v_terms := jsonb_build_object(t_trip, 'confirmed');
  PERFORM pg_temp.demo_registration(e_trip, 'Adam', 'Král', 'team4vse@seznam.cz', '+420601000001', NULL,
    now_ts - interval '40 days', v_terms, ARRAY[45000]);
  PERFORM pg_temp.demo_registration(e_trip, 'Jana', 'Horáková', 'jana.horakova@example.com', '+420602000001', NULL,
    now_ts - interval '39 days', v_terms, ARRAY[45000]);
  PERFORM pg_temp.demo_registration(e_trip, 'Ondřej', 'Kučera', 'ondrej.kucera@example.com', '+420602000002', NULL,
    now_ts - interval '37 days', v_terms, ARRAY[45000]);
  PERFORM pg_temp.demo_registration(e_trip, 'Lucie', 'Procházková', 'lucie.prochazkova@example.com', '+420602000003', NULL,
    now_ts - interval '33 days', v_terms, ARRAY[45000]);
  PERFORM pg_temp.demo_registration(e_trip, 'Martin', 'Beneš', 'martin.benes@example.com', '+420602000004', NULL,
    now_ts - interval '30 days', v_terms, ARRAY[45000]);

  -- ── Volunteer week (ongoing, free): Adam confirmed ──
  v_terms := jsonb_build_object(t_week, 'confirmed');
  PERFORM pg_temp.demo_registration(e_week, 'Adam', 'Král', 'team4vse@seznam.cz', '+420601000001', NULL,
    now_ts - interval '25 days', v_terms);
  PERFORM pg_temp.demo_registration(e_week, 'Klára', 'Šťastná', 'klara.stastna@example.com', '+420603000001', NULL,
    now_ts - interval '24 days', v_terms);
  PERFORM pg_temp.demo_registration(e_week, 'Jiří', 'Navrátil', 'jiri.navratil@example.com', '+420603000002', NULL,
    now_ts - interval '22 days', v_terms);
  PERFORM pg_temp.demo_registration(e_week, 'Markéta', 'Vaňková', 'marketa.vankova@example.com', '+420603000003', NULL,
    now_ts - interval '20 days', v_terms);
  PERFORM pg_temp.demo_registration(e_week, 'Štěpán', 'Hájek', 'stepan.hajek@example.com', '+420603000004', NULL,
    now_ts - interval '18 days', v_terms);
  PERFORM pg_temp.demo_registration(e_week, 'Lenka', 'Dušková', 'lenka.duskova@example.com', '+420603000005', NULL,
    now_ts - interval '15 days', v_terms);

  -- ── Course (open): free places in both terms, no registration of Adam ──
  v_terms := jsonb_build_object(t_course1, 'confirmed');
  PERFORM pg_temp.demo_registration(e_course, 'Ivana', 'Malá', 'ivana.mala@example.com', '+420604000001', NULL,
    now_ts - interval '18 days', v_terms, ARRAY[65000]);
  PERFORM pg_temp.demo_registration(e_course, 'Roman', 'Sýkora', 'roman.sykora@example.com', '+420604000002', NULL,
    now_ts - interval '16 days', v_terms, ARRAY[65000]);
  PERFORM pg_temp.demo_registration(e_course, 'Monika', 'Holubová', 'monika.holubova@example.com', '+420604000003', NULL,
    now_ts - interval '14 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Daniel', 'Moravec', 'daniel.moravec@example.com', '+420604000004', NULL,
    now_ts - interval '11 days', v_terms, ARRAY[65000]);
  PERFORM pg_temp.demo_registration(e_course, 'Alžběta', 'Kopecká', 'alzbeta.kopecka@example.com', '+420604000005', NULL,
    now_ts - interval '7 days', v_terms);
  v_terms := jsonb_build_object(t_course2, 'confirmed');
  PERFORM pg_temp.demo_registration(e_course, 'Gabriela', 'Tichá', 'gabriela.ticha@example.com', '+420604000006', NULL,
    now_ts - interval '12 days', v_terms, ARRAY[85000]);
  PERFORM pg_temp.demo_registration(e_course, 'Vít', 'Matoušek', 'vit.matousek@example.com', '+420604000007', NULL,
    now_ts - interval '9 days', v_terms);
  PERFORM pg_temp.demo_registration(e_course, 'Petra', 'Soukupová', 'petra.soukupova@example.com', '+420604000008', NULL,
    now_ts - interval '5 days', v_terms, ARRAY[85000]);

  -- ── Camp, 1. turnus: five confirmed, starting placements leave Adam's
  -- wish for Filip unsatisfied. Adam can then move into the attic with Filip.
  -- Adam: price 4 500 Kč, 2 000 Kč recorded, 2 500 Kč left. The fixed
  -- variable symbol lies outside the sequence (starts at 1000001), so the
  -- committed Fio statement always matches it.
  v_terms := jsonb_build_object(t_camp1, 'confirmed');
  reg_adam := pg_temp.demo_registration(e_camp, 'Adam', 'Král', 'team4vse@seznam.cz', '+420601000001', 'male',
    now_ts - interval '30 days', v_terms, ARRAY[200000], '9000000001');
  reg_david := pg_temp.demo_registration(e_camp, 'David', 'Horák', 'david.horak@example.com', '+420605000010', 'male',
    now_ts - interval '30 days', v_terms, ARRAY[450000]);
  reg_filip := pg_temp.demo_registration(e_camp, 'Filip', 'Veselý', 'filip.vesely@example.com', '+420605000001', 'male',
    now_ts - interval '29 days', v_terms, ARRAY[450000]);
  reg_eliska := pg_temp.demo_registration(e_camp, 'Eliška', 'Novotná', 'eliska.novotna@example.com', '+420605000002', 'female',
    now_ts - interval '27 days', v_terms);
  reg_tereza := pg_temp.demo_registration(e_camp, 'Tereza', 'Malá', 'tereza.mala@example.com', '+420605000003', 'female',
    now_ts - interval '26 days', v_terms, ARRAY[450000]);

  -- ── Camp, 2. turnus: 10 confirmed (Petr, Lukáš and eight women) plus
  -- five women awaiting evaluation. No starting placements: show the default
  -- capacity proposal, then lock Petr into the large hut and show its impact.
  v_terms := jsonb_build_object(t_camp2, 'confirmed');
  reg_petr := pg_temp.demo_registration(e_camp, 'Petr', 'Svoboda', 'petr.svoboda@example.com', '+420605000004', 'male',
    now_ts - interval '28 days', v_terms, ARRAY[450000]);
  reg_lukas := pg_temp.demo_registration(e_camp, 'Lukáš', 'Černý', 'lukas.cerny@example.com', '+420605000005', 'male',
    now_ts - interval '25 days', v_terms, ARRAY[200000]);
  PERFORM pg_temp.demo_registration(e_camp, 'Nina', 'Dvořáková', 'nina.dvorakova@example.com', '+420605000007', 'female',
    now_ts - interval '23 days', v_terms, ARRAY[450000]);
  PERFORM pg_temp.demo_registration(e_camp, 'Barbora', 'Malá', 'barbora.mala@example.com', '+420605000008', 'female',
    now_ts - interval '21 days', v_terms, ARRAY[450000]);
  PERFORM pg_temp.demo_registration(e_camp, 'Zuzana', 'Nová', 'zuzana.nova@example.com', '+420605000009', 'female',
    now_ts - interval '19 days', v_terms, ARRAY[100000]);
  PERFORM pg_temp.demo_registration(e_camp, 'Iva', 'Benešová', 'iva.benesova@example.com', '+420605000011', 'female',
    now_ts - interval '18 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Hana', 'Veselá', 'hana.vesela@example.com', '+420605000012', 'female',
    now_ts - interval '17 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Veronika', 'Kučerová', 'veronika.kucerova@example.com', '+420605000013', 'female',
    now_ts - interval '16 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Jana', 'Nováková', 'jana.novakova@example.com', '+420605000014', 'female',
    now_ts - interval '15 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Alena', 'Procházková', 'alena.prochazkova@example.com', '+420605000015', 'female',
    now_ts - interval '14 days', v_terms);

  v_terms := jsonb_build_object(t_camp2, 'pending');
  PERFORM pg_temp.demo_registration(e_camp, 'Radka', 'Malá', 'radka.mala@example.com', '+420605000016', 'female',
    now_ts - interval '10 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Lenka', 'Černá', 'lenka.cerna@example.com', '+420605000017', 'female',
    now_ts - interval '9 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Kateřina', 'Dvořáková', 'katerina.dvorakova@example.com', '+420605000018', 'female',
    now_ts - interval '8 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Marie', 'Svobodová', 'marie.svobodova@example.com', '+420605000019', 'female',
    now_ts - interval '7 days', v_terms);
  PERFORM pg_temp.demo_registration(e_camp, 'Eva', 'Novotná', 'eva.novotna@example.com', '+420605000020', 'female',
    now_ts - interval '6 days', v_terms);

  -- ── Initial room placements: the first turnus is saved, unlocked and ready
  -- to demonstrate an unsatisfied wish changing the proposal. The second
  -- turnus starts completely empty.
  INSERT INTO room_placement ("registrationId", "termId", "eventId", "roomId", "isLocked", "placedById", "placedAt") VALUES
    (reg_adam, t_camp1, e_camp, r_buk, false, v_owner, now_ts - interval '3 days'),
    (reg_david, t_camp1, e_camp, r_buk, false, v_owner, now_ts - interval '3 days'),
    (reg_filip, t_camp1, e_camp, r_attic, false, v_owner, now_ts - interval '3 days'),
    (reg_eliska, t_camp1, e_camp, r_javor, false, v_owner, now_ts - interval '3 days'),
    (reg_tereza, t_camp1, e_camp, r_javor, false, v_owner, now_ts - interval '3 days');

  -- Adam starts without a roommate wish. The participant adds Filip during
  -- the demo, so the proposal preview can show the wish become fulfilled.

  RAISE NOTICE 'Sprint 4 demo set ready: organizer team4vse@seznam.cz, organization Spolek Lípa, 4 events, D = %.', d;
END $$;

COMMIT;
