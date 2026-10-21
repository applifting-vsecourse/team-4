import { randomUUID } from 'node:crypto';
import {
  Event,
  EventStatus,
  EventTerm,
  Organization,
  ParticipationStatus,
  Payment,
  PrismaClient,
  Registration,
  Room,
  User,
} from '@/generated/prisma/client';

// Isolated test data (data-model.md §9). Every call uses a fresh suffix for
// names, e-mails and keys, so tests can share one database and run in parallel
// without truncation. There are no domain services yet, so the factories write
// through Prisma and take participation outcomes as input. Once the S2-02/04/08
// services exist, switch these to the services so tests exercise their rules.

const suffix = (): string => randomUUID().slice(0, 8);

/** Organizer row for foreign keys only; it has no credentials and cannot sign in. */
export const createOrganizer = (prisma: PrismaClient): Promise<User> => {
  const s = suffix();
  const now = new Date();
  return prisma.user.create({
    data: {
      id: randomUUID(),
      name: `Organizer ${s}`,
      email: `organizer-${s}@example.test`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    },
  });
};

export const createOrganization = async (
  prisma: PrismaClient,
  options: { ownerId?: string } = {},
): Promise<Organization> => {
  const ownerId = options.ownerId ?? (await createOrganizer(prisma)).id;
  return prisma.organization.create({
    data: {
      name: `Organization ${suffix()}`,
      ownerId,
      members: { create: { userId: ownerId, role: 'owner' } },
    },
  });
};

export interface TermInput {
  startDate: string; // yyyy-MM-dd, inclusive
  endDate: string; // yyyy-MM-dd, inclusive
  priceMinor?: number;
  label?: string;
}

export interface RoomInput {
  bedCount: number;
  /** Indexes into `terms` in which the room is available. */
  termIndexes: number[];
  label?: string;
}

export interface CreatedEvent {
  event: Event;
  terms: EventTerm[];
  rooms: Room[];
}

export const date = (value: string): Date => new Date(`${value}T00:00:00Z`);

export const createEvent = async (
  prisma: PrismaClient,
  options: {
    organizationId: string;
    status?: EventStatus;
    terms?: TermInput[];
    rooms?: RoomInput[];
  },
): Promise<CreatedEvent> => {
  const s = suffix();
  const status = options.status ?? 'open';
  const event = await prisma.event.create({
    data: {
      organizationId: options.organizationId,
      publicId: `t${randomUUID().replace(/-/g, '').slice(0, 15)}`,
      name: `Event ${s}`,
      description: 'Test event',
      location: 'Test location',
      status,
      firstOpenedAt: status === 'draft' ? null : new Date(),
      bankAccountNumber: '123457',
      bankCode: '0100',
      paymentReminderDays: 14,
    },
  });

  const terms: EventTerm[] = [];
  for (const [index, term] of (options.terms ?? []).entries()) {
    terms.push(
      await prisma.eventTerm.create({
        data: {
          eventId: event.id,
          label: term.label ?? `${index + 1}. turnus`,
          startDate: date(term.startDate),
          endDate: date(term.endDate),
          priceMinor: term.priceMinor ?? 100_000,
        },
      }),
    );
  }

  const rooms: Room[] = [];
  for (const [index, room] of (options.rooms ?? []).entries()) {
    rooms.push(
      await prisma.room.create({
        data: {
          eventId: event.id,
          label: room.label ?? `Room ${index + 1}`,
          bedCount: room.bedCount,
        },
      }),
    );
    // Not a nested `create`: Prisma cannot fill the composite (roomId, eventId)
    // key of the child row and fails with a 500-style error.
    await prisma.roomTermAvailability.createMany({
      data: room.termIndexes.map((termIndex) => ({
        roomId: rooms[index].id,
        termId: terms[termIndex].id,
        eventId: event.id,
      })),
    });
  }

  return { event, terms, rooms };
};

export const createRegistration = async (
  prisma: PrismaClient,
  options: {
    event: Event;
    terms: { term: EventTerm; status: ParticipationStatus }[];
    email?: string;
  },
): Promise<Registration> => {
  const s = suffix();
  const email = options.email ?? `participant-${s}@example.test`;
  const account = await prisma.participantAccount.upsert({
    where: { email: email.trim().toLowerCase() },
    create: { email: email.trim().toLowerCase() },
    update: {},
  });
  const now = new Date();
  return prisma.registration.create({
    data: {
      organizationId: options.event.organizationId,
      eventId: options.event.id,
      participantAccountId: account.id,
      submissionKey: randomUUID(),
      firstName: 'Test',
      lastName: `Participant ${s}`,
      email,
      phone: '+420600000000',
      bankAccountNumber: options.event.bankAccountNumber ?? '123457',
      bankCode: options.event.bankCode ?? '0100',
      paymentReminderDays: options.event.paymentReminderDays ?? 14,
      terms: {
        create: options.terms.map(({ term, status }) => ({
          termId: term.id,
          status,
          priceMinor: term.priceMinor,
          decidedAt: now,
        })),
      },
    },
  });
};

export const createPayment = (
  prisma: PrismaClient,
  options: {
    registration: Registration;
    recordedById: string;
    amountMinor: number;
    receivedOn?: string;
  },
): Promise<Payment> =>
  prisma.payment.create({
    data: {
      organizationId: options.registration.organizationId,
      registrationId: options.registration.id,
      submissionKey: randomUUID(),
      amountMinor: options.amountMinor,
      receivedOn: date(options.receivedOn ?? '2026-10-01'),
      recordedById: options.recordedById,
    },
  });
