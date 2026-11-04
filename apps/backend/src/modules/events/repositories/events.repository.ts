import { randomBytes } from 'node:crypto';
import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate, toDate } from '@/modules/events/domain/calendar-date';
import {
  capacityFromBeds,
  EventDetailModel,
  EventInput,
  EventStatus,
  EventSummaryModel,
  EventTermModel,
  OpeningInput,
  PublicCatalogEventModel,
  PublicEventModel,
  publicRegistrationStatus,
  TermInput,
} from '@/modules/events/domain/event';
import { PaymentSettings } from '@/modules/events/domain/payment-settings';
import {
  PresentationInput,
  PublicContact,
} from '@/modules/events/domain/presentation';
import { Injectable } from '@nestjs/common';

/** Every lookup carries the organization and its owner (data-model.md §3.2). */
export type EventScope = {
  organizationId: string;
  ownerId: string;
  eventId: string;
};

export type NewPhoto = {
  objectKey: string;
  contentType: string;
  byteSize: number;
};

export type StoredTerm = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
};

/**
 * Writes on one event inside a transaction that holds the event row lock, so
 * the lock check, the overlap check and the write cannot interleave with
 * another write on the same event or with its first opening (S2-06).
 */
export class LockedEvent {
  constructor(
    private readonly tx: Prisma.TransactionClient,
    public readonly eventId: string,
    public readonly isLocked: boolean,
    public readonly status: EventStatus,
  ) {}

  /** What the opening preconditions are checked against, read under the lock. */
  async openingInput(): Promise<OpeningInput> {
    const event = await this.tx.event.findUniqueOrThrow({
      where: { id: this.eventId },
      select: {
        name: true,
        description: true,
        location: true,
        bankAccountPrefix: true,
        bankAccountNumber: true,
        bankCode: true,
        paymentReminderDays: true,
        _count: { select: { terms: true } },
      },
    });
    return {
      name: event.name,
      description: event.description,
      location: event.location,
      termCount: event._count.terms,
      paymentSettings: toPaymentSettings(event),
    };
  }

  /** The first opening also stamps `firstOpenedAt`, which locks the event. */
  async open(): Promise<void> {
    await this.tx.event.update({
      where: { id: this.eventId },
      data: { status: 'open', firstOpenedAt: new Date() },
    });
  }

  async terms(): Promise<StoredTerm[]> {
    const rows = await this.tx.eventTerm.findMany({
      where: { eventId: this.eventId },
      select: { id: true, label: true, startDate: true, endDate: true },
    });
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      startDate: fromDate(row.startDate),
      endDate: fromDate(row.endDate),
    }));
  }

  async updateBasics(input: EventInput): Promise<void> {
    await this.tx.event.update({
      where: { id: this.eventId },
      data: input,
    });
  }

  async setPublished(isPublished: boolean): Promise<void> {
    await this.tx.event.update({
      where: { id: this.eventId },
      data: { isPublished },
    });
  }

  async setChangeApprovalDays(days: number | null): Promise<void> {
    await this.tx.event.update({
      where: { id: this.eventId },
      data: { changeApprovalDays: days },
    });
  }

  async description(): Promise<string> {
    const event = await this.tx.event.findUniqueOrThrow({
      where: { id: this.eventId },
      select: { description: true },
    });
    return event.description;
  }

  async updatePresentation(input: PresentationInput): Promise<void> {
    await this.tx.event.update({
      where: { id: this.eventId },
      data: {
        description: input.description,
        conditions: input.conditions,
        contactName: input.contact?.name ?? null,
        contactEmail: input.contact?.email ?? null,
        contactPhone: input.contact?.phone ?? null,
      },
    });
  }

  async photoCount(): Promise<number> {
    return this.tx.eventPhoto.count({ where: { eventId: this.eventId } });
  }

  async insertPhoto(photo: NewPhoto): Promise<void> {
    await this.tx.eventPhoto.create({
      data: { eventId: this.eventId, ...photo },
    });
  }

  /** The removed photo's object key; null when it does not belong to this event. */
  async deletePhoto(photoId: string): Promise<string | null> {
    const photo = await this.tx.eventPhoto.findFirst({
      where: { id: photoId, eventId: this.eventId },
      select: { objectKey: true },
    });
    if (!photo) return null;
    await this.tx.eventPhoto.delete({ where: { id: photoId } });
    return photo.objectKey;
  }

  async updatePaymentSettings(settings: PaymentSettings): Promise<void> {
    await this.tx.event.update({
      where: { id: this.eventId },
      data: settings,
    });
  }

  async insertTerm(input: TermInput): Promise<void> {
    await this.tx.eventTerm.create({
      data: { eventId: this.eventId, ...termData(input) },
    });
  }

  /** False when the term does not belong to this event. */
  async updateTerm(termId: string, input: TermInput): Promise<boolean> {
    const { count } = await this.tx.eventTerm.updateMany({
      where: { id: termId, eventId: this.eventId },
      data: termData(input),
    });
    return count === 1;
  }

  /** False when the term does not belong to this event. */
  async deleteTerm(termId: string): Promise<boolean> {
    const { count } = await this.tx.eventTerm.deleteMany({
      where: { id: termId, eventId: this.eventId },
    });
    return count === 1;
  }
}

const termData = (
  input: TermInput,
): Pick<
  Prisma.EventTermUncheckedCreateInput,
  'label' | 'startDate' | 'endDate' | 'priceMinor'
> => ({
  label: input.label,
  startDate: toDate(input.startDate),
  endDate: toDate(input.endDate),
  priceMinor: input.priceMinor,
});

const toPaymentSettings = (event: {
  bankAccountPrefix: string | null;
  bankAccountNumber: string | null;
  bankCode: string | null;
  paymentReminderDays: number | null;
}): PaymentSettings | null =>
  event.bankAccountNumber !== null &&
  event.bankCode !== null &&
  event.paymentReminderDays !== null
    ? {
        bankAccountPrefix: event.bankAccountPrefix,
        bankAccountNumber: event.bankAccountNumber,
        bankCode: event.bankCode,
        paymentReminderDays: event.paymentReminderDays,
      }
    : null;

const toContact = (event: {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}): PublicContact | null =>
  event.contactName !== null && event.contactEmail !== null
    ? {
        name: event.contactName,
        email: event.contactEmail,
        phone: event.contactPhone,
      }
    : null;

const PRESENTATION_SELECT = {
  conditions: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  photos: {
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true },
  },
} satisfies Prisma.EventSelect;

const PUBLIC_TERM_SELECT = {
  orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
  select: {
    id: true,
    label: true,
    startDate: true,
    endDate: true,
    priceMinor: true,
  },
} satisfies Prisma.Event$termsArgs;

const toPublicTerm = (term: {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  priceMinor: number;
}): Omit<EventTermModel, 'capacity' | 'programmeItemCount'> => ({
  id: term.id,
  label: term.label,
  startDate: fromDate(term.startDate),
  endDate: fromDate(term.endDate),
  priceMinor: term.priceMinor,
});

// 9 random bytes are 12 URL-safe characters for the public link /e/:publicId.
const newPublicId = (): string => randomBytes(9).toString('base64url');

@Injectable()
export class EventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the organization is not owned by the caller. */
  async findAllInOrganization(
    organizationId: string,
    ownerId: string,
  ): Promise<EventSummaryModel[] | null> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, ownerId },
      select: {
        events: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            name: true,
            description: true,
            location: true,
            status: true,
            terms: { select: { startDate: true, endDate: true } },
          },
        },
      },
    });
    if (!organization) return null;
    return organization.events.map((event) => {
      const starts = event.terms.map((term) => fromDate(term.startDate));
      const ends = event.terms.map((term) => fromDate(term.endDate));
      return new EventSummaryModel(
        event.id,
        event.name,
        event.description,
        event.location,
        event.status,
        event.terms.length,
        event.terms.length > 0
          ? {
              startDate: starts.reduce((a, b) => (b < a ? b : a)),
              endDate: ends.reduce((a, b) => (b > a ? b : a)),
            }
          : null,
      );
    });
  }

  async findDetail(scope: EventScope): Promise<EventDetailModel | null> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: scope.eventId,
        organizationId: scope.organizationId,
        organization: { ownerId: scope.ownerId },
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        description: true,
        location: true,
        status: true,
        firstOpenedAt: true,
        isPublished: true,
        changeApprovalDays: true,
        bankAccountPrefix: true,
        bankAccountNumber: true,
        bankCode: true,
        paymentReminderDays: true,
        ...PRESENTATION_SELECT,
        terms: {
          orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            label: true,
            startDate: true,
            endDate: true,
            priceMinor: true,
            roomAvailabilities: {
              select: { isAvailable: true, baseBeds: true, extraBeds: true },
            },
            _count: { select: { programmeItems: true } },
          },
        },
      },
    });
    if (!event) return null;
    return new EventDetailModel(
      event.id,
      event.name,
      event.description,
      event.location,
      event.status,
      event.firstOpenedAt !== null,
      event.terms.map(
        (term) =>
          new EventTermModel(
            term.id,
            term.label,
            fromDate(term.startDate),
            fromDate(term.endDate),
            term.priceMinor,
            capacityFromBeds(term.roomAvailabilities),
            term._count.programmeItems,
          ),
      ),
      toPaymentSettings(event),
      event.publicId,
      event.isPublished,
      event.changeApprovalDays,
      event.conditions,
      toContact(event),
      event.photos.map((photo) => photo.id),
    );
  }

  /** The object key of a photo of the caller's event; null otherwise. */
  async findPhotoKey(
    scope: EventScope,
    photoId: string,
  ): Promise<string | null> {
    const photo = await this.prisma.eventPhoto.findFirst({
      where: {
        id: photoId,
        event: {
          id: scope.eventId,
          organizationId: scope.organizationId,
          organization: { ownerId: scope.ownerId },
        },
      },
      select: { objectKey: true },
    });
    return photo?.objectKey ?? null;
  }

  /** A new event is a draft. Null when the organization is not the caller's. */
  async create(
    organizationId: string,
    ownerId: string,
    input: EventInput,
  ): Promise<string | null> {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, ownerId },
      select: { id: true },
    });
    if (!organization) return null;
    const event = await this.prisma.event.create({
      data: { organizationId, publicId: newPublicId(), ...input },
      select: { id: true },
    });
    return event.id;
  }

  /** `{ found: false }` when the event is not in the caller's organization. */
  async withLockedEvent<T>(
    scope: EventScope,
    work: (event: LockedEvent) => Promise<T>,
  ): Promise<{ found: true; result: T } | { found: false }> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { firstOpenedAt: Date | null; status: EventStatus }[]
      >`
        SELECT e."firstOpenedAt", e."status"
        FROM "event" e
        JOIN "organization" o ON o."id" = e."organizationId"
        WHERE e."id" = ${scope.eventId}::uuid
          AND e."organizationId" = ${scope.organizationId}::uuid
          AND o."ownerId" = ${scope.ownerId}
        FOR UPDATE OF e`;
      const row = rows[0];
      if (!row) return { found: false };
      const result = await work(
        new LockedEvent(
          tx,
          scope.eventId,
          row.firstOpenedAt !== null,
          row.status,
        ),
      );
      return { found: true, result };
    });
  }

  /**
   * Only an open event is public. A draft, a closed and a missing event all
   * give null, so the link reveals nothing about which of them it is.
   */
  async findOpenByPublicId(publicId: string): Promise<PublicEventModel | null> {
    const event = await this.prisma.event.findFirst({
      where: { publicId, status: 'open' },
      select: {
        name: true,
        description: true,
        location: true,
        isPublished: true,
        terms: PUBLIC_TERM_SELECT,
      },
    });
    if (!event) return null;
    return new PublicEventModel(
      event.name,
      event.description,
      event.location,
      event.terms.map(toPublicTerm),
      event.isPublished,
    );
  }

  /**
   * Only a published event has a catalog detail, whatever its registration
   * status. An unpublished and a missing event both give null (F55).
   */
  async findPublishedByPublicId(
    publicId: string,
  ): Promise<PublicCatalogEventModel | null> {
    const event = await this.prisma.event.findFirst({
      where: { publicId, isPublished: true },
      select: {
        name: true,
        description: true,
        location: true,
        status: true,
        organization: { select: { name: true } },
        ...PRESENTATION_SELECT,
        terms: PUBLIC_TERM_SELECT,
      },
    });
    if (!event) return null;
    return new PublicCatalogEventModel(
      event.name,
      event.organization.name,
      event.description,
      event.location,
      event.conditions,
      toContact(event),
      event.photos.map((photo) => photo.id),
      publicRegistrationStatus(event.status),
      event.terms.map(toPublicTerm),
    );
  }

  /** The object key of a photo of a published event; null otherwise. */
  async findPublishedPhotoKey(
    publicId: string,
    photoId: string,
  ): Promise<string | null> {
    const photo = await this.prisma.eventPhoto.findFirst({
      where: { id: photoId, event: { publicId, isPublished: true } },
      select: { objectKey: true },
    });
    return photo?.objectKey ?? null;
  }
}
