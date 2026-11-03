import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { fromDate, toDate } from '@/modules/events/domain/calendar-date';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  ProgrammeItemInput,
  ProgrammeItemModel,
  ProgrammeTerm,
} from '@/modules/programme/domain/programme-item';
import { Injectable } from '@nestjs/common';

const itemSelect = {
  id: true,
  title: true,
  startDate: true,
  startTime: true,
  place: true,
  description: true,
} satisfies Prisma.ProgrammeItemSelect;

const toModel = (
  row: Prisma.ProgrammeItemGetPayload<{ select: typeof itemSelect }>,
): ProgrammeItemModel => ({ ...row, startDate: fromDate(row.startDate) });

const chronological = [
  { startDate: 'asc' },
  { startTime: 'asc' },
  { id: 'asc' },
] satisfies Prisma.ProgrammeItemOrderByWithRelationInput[];

/**
 * Every query names the term together with its event, and the organizer's
 * queries also the organization owner, so an item cannot be reached or placed
 * under another term or event (F65).
 */
@Injectable()
export class ProgrammeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the term is not in an event of an organization of the caller. */
  async findOrganizerTerm(
    scope: EventScope,
    termId: string,
  ): Promise<ProgrammeTerm | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: {
        id: termId,
        eventId: scope.eventId,
        event: {
          organizationId: scope.organizationId,
          organization: { ownerId: scope.ownerId },
        },
      },
      select: { startDate: true, endDate: true },
    });
    return (
      term && {
        startDate: fromDate(term.startDate),
        endDate: fromDate(term.endDate),
      }
    );
  }

  async list(termId: string): Promise<ProgrammeItemModel[]> {
    const rows = await this.prisma.programmeItem.findMany({
      where: { termId },
      orderBy: chronological,
      select: itemSelect,
    });
    return rows.map(toModel);
  }

  async insert(
    eventId: string,
    termId: string,
    input: ProgrammeItemInput,
  ): Promise<void> {
    await this.prisma.programmeItem.create({
      data: { eventId, termId, ...this.data(input) },
    });
  }

  /** False when the item is not in this term. */
  async update(
    termId: string,
    itemId: string,
    input: ProgrammeItemInput,
  ): Promise<boolean> {
    const { count } = await this.prisma.programmeItem.updateMany({
      where: { id: itemId, termId },
      data: this.data(input),
    });
    return count === 1;
  }

  /** False when the item is not in this term. */
  async delete(termId: string, itemId: string): Promise<boolean> {
    const { count } = await this.prisma.programmeItem.deleteMany({
      where: { id: itemId, termId },
    });
    return count === 1;
  }

  /**
   * The programme of a term the participant is confirmed in; null for a
   * waitlisted term, a term outside the registration or a registration of
   * another account. The status is read in the same query as the items.
   */
  async listForConfirmed(
    accountId: string,
    registrationId: string,
    termId: string,
  ): Promise<ProgrammeItemModel[] | null> {
    const confirmed = await this.prisma.registrationTerm.findFirst({
      where: {
        registrationId,
        termId,
        status: 'confirmed',
        registration: { participantAccountId: accountId },
      },
      select: {
        term: {
          select: {
            programmeItems: { orderBy: chronological, select: itemSelect },
          },
        },
      },
    });
    return confirmed && confirmed.term.programmeItems.map(toModel);
  }

  private data(
    input: ProgrammeItemInput,
  ): Omit<ProgrammeItemInput, 'startDate'> & { startDate: Date } {
    return {
      title: input.title,
      startDate: toDate(input.startDate),
      startTime: input.startTime,
      place: input.place,
      description: input.description,
    };
  }
}
