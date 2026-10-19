import { PrismaService } from '@/core/prisma/prisma.service';
import { ParticipationStatus } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';

// Demo data for local development and staging (data-model.md §9). Fictional
// people and accounts only. Idempotent: organizers are matched by e-mail,
// participant accounts by e-mail and everything else by a fixed id, so running
// the seed again changes nothing.
//
// Organizer A owns two organizations (switcher) with open, draft and closed
// events; organizer B owns a third organization for isolation checks. One
// participant has registrations in both A's and B's events.

// The well-known demo password is only for local development and tests. Any
// other environment (staging) must supply SEED_PASSWORD, otherwise anyone who
// reads this file could sign in as a seeded organizer.
const LOCAL_SEED_PASSWORD = 'akcio-demo-heslo';
const LOCAL_ENVIRONMENTS = ['development', 'test'];

const seedPassword = (): string => {
  const password = process.env.SEED_PASSWORD;
  if (password) return password;
  if (LOCAL_ENVIRONMENTS.includes(process.env.NODE_ENV ?? '')) {
    return LOCAL_SEED_PASSWORD;
  }
  throw new Error(
    'SEED_PASSWORD is required outside NODE_ENV=development/test.',
  );
};

const id = (n: number): string =>
  `00000000-0000-7000-8000-${n.toString().padStart(12, '0')}`;

const date = (value: string): Date => new Date(`${value}T00:00:00Z`);

// Fictional account, valid under the Czech mod-11 checksum.
const BANK = { bankAccountNumber: '123457', bankCode: '0100' };
const DUE_DAYS = 14;

const ensureOrganizer = async (
  prisma: PrismaService,
  auth: BetterAuth,
  password: string,
  name: string,
  email: string,
): Promise<string> => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const { user } = await auth.api.signUpEmail({
    body: { name, email, password },
  });
  return user.id;
};

const ensureOrganization = async (
  prisma: PrismaService,
  organizationId: string,
  name: string,
  ownerId: string,
): Promise<void> => {
  await prisma.organization.upsert({
    where: { id: organizationId },
    create: { id: organizationId, name, ownerId },
    update: {},
  });
  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId, userId: ownerId } },
    create: { organizationId, userId: ownerId, role: 'owner' },
    update: {},
  });
};

interface SeedEvent {
  id: string;
  organizationId: string;
  publicId: string;
  name: string;
  description: string;
  location: string;
  status: 'draft' | 'open' | 'closed';
  terms: {
    id: string;
    label: string;
    startDate: string;
    endDate: string;
    priceMinor: number;
  }[];
  rooms: { id: string; label: string; bedCount: number; termIds: string[] }[];
}

const ensureEvent = async (
  prisma: PrismaService,
  event: SeedEvent,
): Promise<void> => {
  const configured = event.status !== 'draft';
  await prisma.event.upsert({
    where: { id: event.id },
    create: {
      id: event.id,
      organizationId: event.organizationId,
      publicId: event.publicId,
      name: event.name,
      description: event.description,
      location: event.location,
      status: event.status,
      firstOpenedAt: configured ? new Date('2026-09-01T08:00:00Z') : null,
      ...(configured ? { ...BANK, paymentDueDays: DUE_DAYS } : {}),
    },
    update: {},
  });
  for (const term of event.terms) {
    await prisma.eventTerm.upsert({
      where: { id: term.id },
      create: {
        id: term.id,
        eventId: event.id,
        label: term.label,
        startDate: date(term.startDate),
        endDate: date(term.endDate),
        priceMinor: term.priceMinor,
      },
      update: {},
    });
  }
  for (const room of event.rooms) {
    await prisma.room.upsert({
      where: { id: room.id },
      create: {
        id: room.id,
        eventId: event.id,
        label: room.label,
        bedCount: room.bedCount,
      },
      update: {},
    });
    await prisma.roomTermAvailability.createMany({
      data: room.termIds.map((termId) => ({
        roomId: room.id,
        termId,
        eventId: event.id,
      })),
      skipDuplicates: true,
    });
  }
};

interface SeedRegistration {
  id: string;
  event: SeedEvent;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  receivedAt: string;
  terms: { termId: string; status: ParticipationStatus }[];
  payments: { id: string; amountMinor: number; receivedOn: string }[];
  recordedById: string;
}

const ensureRegistration = async (
  prisma: PrismaService,
  registration: SeedRegistration,
): Promise<void> => {
  const existing = await prisma.registration.findUnique({
    where: { id: registration.id },
  });
  if (!existing) {
    const account = await prisma.participantAccount.upsert({
      where: { email: registration.email.toLowerCase() },
      create: { email: registration.email.toLowerCase() },
      update: {},
    });
    const prices = new Map(
      registration.event.terms.map((term) => [term.id, term.priceMinor]),
    );
    const receivedAt = new Date(registration.receivedAt);
    const due = registration.terms
      .filter(({ status }) => status === 'confirmed')
      .reduce((sum, { termId }) => sum + (prices.get(termId) ?? 0), 0);
    // Received dates are chosen outside DST changes, so N × 24 h equals the
    // same Prague wall-clock time N days later (data-model.md §3.9).
    const paymentDueAt =
      due > 0
        ? new Date(receivedAt.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000)
        : null;

    await prisma.registration.create({
      data: {
        id: registration.id,
        organizationId: registration.event.organizationId,
        eventId: registration.event.id,
        participantAccountId: account.id,
        submissionKey: registration.id,
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        receivedAt,
        paymentDueAt,
        ...BANK,
        paymentDueDays: DUE_DAYS,
        terms: {
          create: registration.terms.map(({ termId, status }) => ({
            termId,
            status,
            priceMinor: prices.get(termId) ?? 0,
            decidedAt: receivedAt,
          })),
        },
      },
    });
  }

  for (const payment of registration.payments) {
    await prisma.payment.upsert({
      where: { id: payment.id },
      create: {
        id: payment.id,
        organizationId: registration.event.organizationId,
        registrationId: registration.id,
        submissionKey: payment.id,
        amountMinor: payment.amountMinor,
        receivedOn: date(payment.receivedOn),
        recordedById: registration.recordedById,
      },
      update: {},
    });
  }
};

export const seedDatabase = async (
  prisma: PrismaService,
  auth: BetterAuth,
): Promise<void> => {
  const password = seedPassword();
  const organizerA = await ensureOrganizer(
    prisma,
    auth,
    password,
    'Alena Pořadatelová',
    'org-a@example.test',
  );
  const organizerB = await ensureOrganizer(
    prisma,
    auth,
    password,
    'Bohumil Organizátor',
    'org-b@example.test',
  );

  const orgA = id(1);
  const orgA2 = id(2);
  const orgB = id(3);
  await ensureOrganization(prisma, orgA, 'Spolek Jasan', organizerA);
  await ensureOrganization(prisma, orgA2, 'Sportovní klub Modrá', organizerA);
  await ensureOrganization(prisma, orgB, 'Horský spolek Horizont', organizerB);

  // Organization A: open event with partly filled, full and free terms.
  const summerCamp: SeedEvent = {
    id: id(101),
    organizationId: orgA,
    publicId: 'demo-letni',
    name: 'Letní tábor 2027',
    description: 'Týden her a výletů v přírodě pro dospělé.',
    location: 'Tábořiště Jasan, Pec',
    status: 'open',
    terms: [
      {
        id: id(111),
        label: '1. turnus',
        startDate: '2027-07-04',
        endDate: '2027-07-10',
        priceMinor: 450_000,
      },
      {
        id: id(112),
        label: '2. turnus',
        startDate: '2027-07-11',
        endDate: '2027-07-17',
        priceMinor: 480_000,
      },
      {
        id: id(113),
        label: 'Den otevřených dveří',
        startDate: '2027-07-18',
        endDate: '2027-07-18',
        priceMinor: 0,
      },
    ],
    rooms: [
      { id: id(121), label: 'Chatka 1', bedCount: 2, termIds: [id(111)] },
      { id: id(122), label: 'Chatka 2', bedCount: 3, termIds: [id(111)] },
      {
        id: id(123),
        label: 'Pokoj u kuchyně',
        bedCount: 1,
        termIds: [id(112)],
      },
      { id: id(124), label: 'Klubovna', bedCount: 10, termIds: [id(113)] },
    ],
  };
  const autumnWeekend: SeedEvent = {
    id: id(102),
    organizationId: orgA,
    publicId: 'demo-podzim',
    name: 'Podzimní víkend',
    description: 'Připravovaná akce, zatím koncept.',
    location: 'Chata Jasan',
    status: 'draft',
    terms: [
      {
        id: id(131),
        label: 'Víkend',
        startDate: '2027-10-08',
        endDate: '2027-10-10',
        priceMinor: 150_000,
      },
    ],
    rooms: [],
  };
  const springCamp: SeedEvent = {
    id: id(103),
    organizationId: orgA,
    publicId: 'demo-jaro',
    name: 'Jarní soustředění 2027',
    description: 'Přihlašování je už uzavřené.',
    location: 'Sokolovna Jasan',
    status: 'closed',
    terms: [
      {
        id: id(141),
        label: 'Soustředění',
        startDate: '2027-04-02',
        endDate: '2027-04-05',
        priceMinor: 200_000,
      },
    ],
    rooms: [
      { id: id(142), label: 'Tělocvična', bedCount: 20, termIds: [id(141)] },
    ],
  };
  const clubDraft: SeedEvent = {
    id: id(104),
    organizationId: orgA2,
    publicId: 'demo-zima',
    name: 'Zimní kemp',
    description: 'Koncept akce druhé organizace.',
    location: 'Horní Modrá',
    status: 'draft',
    terms: [
      {
        id: id(151),
        label: 'Zimní týden',
        startDate: '2028-01-09',
        endDate: '2028-01-15',
        priceMinor: 520_000,
      },
    ],
    rooms: [],
  };
  // Organization B: its own data, to check that nothing leaks.
  const mountainHut: SeedEvent = {
    id: id(105),
    organizationId: orgB,
    publicId: 'demo-horizont',
    name: 'Horská chata 2027',
    description: 'Prodloužený víkend na horách.',
    location: 'Chata Horizont, Krkonoše',
    status: 'open',
    terms: [
      {
        id: id(161),
        label: 'Prodloužený víkend',
        startDate: '2027-08-26',
        endDate: '2027-08-29',
        priceMinor: 320_000,
      },
    ],
    rooms: [
      { id: id(162), label: 'Podkroví', bedCount: 4, termIds: [id(161)] },
    ],
  };
  for (const event of [
    summerCamp,
    autumnWeekend,
    springCamp,
    clubDraft,
    mountainHut,
  ]) {
    await ensureEvent(prisma, event);
  }

  const [term1, term2, openDay] = summerCamp.terms.map((term) => term.id);
  const registrations: SeedRegistration[] = [
    {
      // Confirmed only, partial payment. Also registered with organization B.
      id: id(201),
      event: summerCamp,
      firstName: 'Jana',
      lastName: 'Nováková',
      email: 'jana.novakova@example.test',
      phone: '+420600000001',
      receivedAt: '2026-09-02T07:15:00Z',
      terms: [{ termId: term1, status: 'confirmed' }],
      payments: [
        { id: id(301), amountMinor: 200_000, receivedOn: '2026-09-05' },
      ],
      recordedById: organizerA,
    },
    {
      // Confirmed in both turnusy (takes the only bed of term 2), paid exactly.
      id: id(202),
      event: summerCamp,
      firstName: 'Petr',
      lastName: 'Svoboda',
      email: 'petr.svoboda@example.test',
      phone: '+420600000002',
      receivedAt: '2026-09-02T09:40:00Z',
      terms: [
        { termId: term1, status: 'confirmed' },
        { termId: term2, status: 'confirmed' },
      ],
      payments: [
        { id: id(302), amountMinor: 500_000, receivedOn: '2026-09-07' },
        { id: id(303), amountMinor: 430_000, receivedOn: '2026-09-12' },
      ],
      recordedById: organizerA,
    },
    {
      // Mixed: confirmed in term 1, waitlisted in the full term 2. Unpaid.
      id: id(203),
      event: summerCamp,
      firstName: 'Eva',
      lastName: 'Dvořáková',
      email: 'eva.dvorakova@example.test',
      phone: '+421900000003',
      receivedAt: '2026-09-03T18:05:00Z',
      terms: [
        { termId: term1, status: 'confirmed' },
        { termId: term2, status: 'waitlisted' },
      ],
      payments: [],
      recordedById: organizerA,
    },
    {
      // Waitlisted only: no debt and no due date.
      id: id(204),
      event: summerCamp,
      firstName: 'Martin',
      lastName: 'Černý',
      email: 'martin.cerny@example.test',
      phone: '+420600000004',
      receivedAt: '2026-09-04T11:30:00Z',
      terms: [{ termId: term2, status: 'waitlisted' }],
      payments: [],
      recordedById: organizerA,
    },
    {
      // Free term only, with a payment that becomes an overpayment.
      id: id(205),
      event: summerCamp,
      firstName: 'Lucie',
      lastName: 'Procházková',
      email: 'lucie.prochazkova@example.test',
      phone: '+420600000005',
      receivedAt: '2026-09-05T08:00:00Z',
      terms: [{ termId: openDay, status: 'confirmed' }],
      payments: [
        { id: id(304), amountMinor: 10_000, receivedOn: '2026-09-08' },
      ],
      recordedById: organizerA,
    },
    {
      // Same participant as id(201), in organization B's event.
      id: id(206),
      event: mountainHut,
      firstName: 'Jana',
      lastName: 'Nováková',
      email: 'jana.novakova@example.test',
      phone: '+420600000001',
      receivedAt: '2026-09-06T10:00:00Z',
      terms: [{ termId: mountainHut.terms[0].id, status: 'confirmed' }],
      payments: [],
      recordedById: organizerB,
    },
    {
      id: id(207),
      event: mountainHut,
      firstName: 'Tomáš',
      lastName: 'Veselý',
      email: 'tomas.vesely@example.test',
      phone: '+420600000007',
      receivedAt: '2026-09-07T16:20:00Z',
      terms: [{ termId: mountainHut.terms[0].id, status: 'confirmed' }],
      payments: [
        { id: id(305), amountMinor: 320_000, receivedOn: '2026-09-10' },
      ],
      recordedById: organizerB,
    },
  ];
  for (const registration of registrations) {
    await ensureRegistration(prisma, registration);
  }

  console.log(
    'Seeded demo data. Organizers org-a@example.test and org-b@example.test.',
  );
};
