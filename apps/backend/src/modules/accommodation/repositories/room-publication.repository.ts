import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

/** Whether the room placements of a term are published (S4-02, #341). */
export type TermPublication = {
  /** When they were published; null while they are not. */
  publishedAt: Date | null;
};

/**
 * The publication of a term's room placements. Every method answers null for
 * a term outside the organizer's events.
 */
@Injectable()
export class RoomPublicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(
    scope: EventScope,
    termId: string,
  ): Promise<TermPublication | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: this.termOf(scope, termId),
      select: { roomPublication: { select: { publishedAt: true } } },
    });
    if (!term) return null;
    return { publishedAt: term.roomPublication?.publishedAt ?? null };
  }

  /** Publishes the term; a published one keeps when it was published. */
  async publish(
    scope: EventScope,
    termId: string,
    userId: string,
  ): Promise<TermPublication | null> {
    if (!(await this.exists(scope, termId))) return null;
    const row = await this.prisma.roomPublication.upsert({
      where: { termId },
      create: { termId, eventId: scope.eventId, publishedById: userId },
      update: {},
      select: { publishedAt: true },
    });
    return { publishedAt: row.publishedAt };
  }

  /** Takes the publication back; an unpublished term stays so. */
  async unpublish(
    scope: EventScope,
    termId: string,
  ): Promise<TermPublication | null> {
    if (!(await this.exists(scope, termId))) return null;
    await this.prisma.roomPublication.deleteMany({
      where: { termId, eventId: scope.eventId },
    });
    return { publishedAt: null };
  }

  private async exists(scope: EventScope, termId: string): Promise<boolean> {
    return (
      (await this.prisma.eventTerm.count({
        where: this.termOf(scope, termId),
      })) > 0
    );
  }

  private termOf(
    scope: EventScope,
    termId: string,
  ): Prisma.EventTermWhereInput {
    return {
      id: termId,
      eventId: scope.eventId,
      event: {
        organizationId: scope.organizationId,
        organization: { ownerId: scope.ownerId },
      },
    };
  }
}
