import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  byName,
  fullName,
  invalidWishes,
  Roommate,
  RoommateWishes,
} from '@/modules/registrations/domain/roommate-wish';
import { Injectable } from '@nestjs/common';

/** What saving the wishes did; null when the participant cannot use them. */
export type WishesSave =
  | { result: 'saved'; wishes: RoommateWishes }
  | { result: 'invalid'; message: string }
  | null;

const confirmedSomewhere = {
  terms: { some: { status: 'confirmed' as const } },
};

const named = { id: true, firstName: true, lastName: true } as const;

const roommate = (person: {
  id: string;
  firstName: string;
  lastName: string;
}): Roommate => ({ registrationId: person.id, name: fullName(person) });

/** Roommate wishes of registrations (S4-05, #339). */
@Injectable()
export class RoommateWishesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The author's candidates and wishes; null unless the registration is the
   * participant's own and confirmed in at least one term.
   */
  async findForParticipant(
    accountId: string,
    registrationId: string,
  ): Promise<RoommateWishes | null> {
    return this.read(this.prisma, accountId, registrationId);
  }

  /**
   * Replaces the author's wishes with `registrationIds`, or nothing. The
   * author's registration is locked first, so two saves of the same author
   * run one after the other. NO KEY UPDATE leaves the key-share locks of the
   * wishes' foreign keys free, so two people saving wishes for each other at
   * once don't deadlock.
   */
  async replaceForParticipant(
    accountId: string,
    registrationId: string,
    registrationIds: readonly string[],
  ): Promise<WishesSave> {
    return this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ eventId: string }[]>`
        SELECT "eventId" FROM "registration"
        WHERE "id" = ${registrationId}::uuid
          AND "participantAccountId" = ${accountId}::uuid
        FOR NO KEY UPDATE`;
      if (!locked) return null;
      const { eventId } = locked;
      const current = await this.read(tx, accountId, registrationId);
      if (!current) return null;
      const invalid = invalidWishes(
        registrationId,
        registrationIds,
        new Set(current.candidates.map((c) => c.registrationId)),
        new Set(current.wishes.map((w) => w.registrationId)),
      );
      if (invalid) return { result: 'invalid', message: invalid };

      await tx.roommateWish.deleteMany({
        where: {
          fromRegistrationId: registrationId,
          toRegistrationId: { notIn: [...registrationIds] },
        },
      });
      await tx.roommateWish.createMany({
        data: registrationIds.map((toRegistrationId) => ({
          eventId,
          fromRegistrationId: registrationId,
          toRegistrationId,
        })),
        skipDuplicates: true,
      });
      return {
        result: 'saved',
        wishes: (await this.read(tx, accountId, registrationId))!,
      };
    });
  }

  /**
   * The wishes of a registration as its event's organizer sees them;
   * undefined for a registration outside the organizer's events.
   */
  async findForOrganizer(
    scope: EventScope,
    registrationId: string,
  ): Promise<Roommate[] | undefined> {
    const registration = await this.prisma.registration.findFirst({
      where: {
        id: registrationId,
        eventId: scope.eventId,
        organizationId: scope.organizationId,
        event: { organization: { ownerId: scope.ownerId } },
      },
      select: {
        roommateWishes: { select: { to: { select: named } } },
      },
    });
    if (!registration) return undefined;
    return registration.roommateWishes.map((w) => roommate(w.to)).sort(byName);
  }

  private async read(
    db: Prisma.TransactionClient,
    accountId: string,
    registrationId: string,
  ): Promise<RoommateWishes | null> {
    const author = await db.registration.findFirst({
      where: {
        id: registrationId,
        participantAccountId: accountId,
        ...confirmedSomewhere,
      },
      select: {
        eventId: true,
        roommateWishes: { select: { to: { select: named } } },
      },
    });
    if (!author) return null;
    const candidates = await db.registration.findMany({
      where: {
        eventId: author.eventId,
        id: { not: registrationId },
        ...confirmedSomewhere,
      },
      select: named,
    });
    return {
      candidates: candidates.map(roommate).sort(byName),
      wishes: author.roommateWishes.map((w) => roommate(w.to)).sort(byName),
    };
  }
}
