import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  hardAttributeFrom,
  questionAttributesSelect,
} from '@/modules/accommodation/domain/attributes';
import { ManualValue } from '@/modules/accommodation/domain/effective-value';
import {
  ProposalRules,
  ProposalSnapshot,
  ProposalTermRoom,
} from '@/modules/accommodation/domain/proposal-input';
import {
  Names,
  ProposalStatus,
  StoredProposal,
} from '@/modules/accommodation/domain/proposal-view';
import {
  DEFAULT_SOFT_ATTRIBUTES,
  readNeutralValues,
} from '@/modules/accommodation/domain/room-proposal-preferences';
import { ownedEvent } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { RoomProposalResult } from '@/modules/accommodation/solver/room-proposal.types';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

/** What the room proposal of one term reads, before answers and placements. */
export type ProposalTermData = {
  rules: ProposalRules;
  /** Every room of the event with its beds in the term (O6). */
  rooms: ProposalTermRoom[];
  /** The confirmed participants of the term. */
  people: {
    registrationId: string;
    receivedAt: Date;
    manualValue: ManualValue | null;
  }[];
  /** The term's layout version now (spec §7.1); 0 before its first change. */
  layoutVersion: number;
};

/** A stored room proposal of a term (spec §7.3). */
export type RoomProposalModel = {
  id: string;
  eventId: string;
  termId: string;
  status: ProposalStatus;
  triggeredById: string | null;
  solverVersion: string;
  input: ProposalSnapshot;
  /** The layout; null for a failed proposal. */
  result: unknown;
  error: string | null;
  /** The term's layout version the proposal read; current while equal. */
  layoutVersion: number;
  startedAt: Date;
  finishedAt: Date;
};

const proposalSelect = {
  id: true,
  eventId: true,
  termId: true,
  status: true,
  triggeredById: true,
  solverVersion: true,
  input: true,
  result: true,
  error: true,
  layoutVersion: true,
  startedAt: true,
  finishedAt: true,
} satisfies Prisma.AccommodationRoomProposalSelect;

const toProposal = (
  row: Prisma.AccommodationRoomProposalGetPayload<{
    select: typeof proposalSelect;
  }>,
): RoomProposalModel => ({
  ...row,
  input: row.input as unknown as ProposalSnapshot,
});

/** What the organizer's view of a term's proposal reads (spec §7). */
export type ProposalTermState = {
  layoutVersion: number;
  /** A proposal runs, or the organizer asked for one. */
  isRunning: boolean;
  /** When the next proposal is due; null when none is scheduled. */
  scheduledAt: Date | null;
  latest: StoredProposal | null;
  /** The newest solved proposal; the latest one when it is solved. */
  lastSolved: StoredProposal | null;
  /** Of the people in those proposals. */
  names: Names;
};

const asJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

@Injectable()
export class RoomProposalRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The term as it is now; null when the term is not one of the event's. */
  async findTerm(
    eventId: string,
    termId: string,
  ): Promise<ProposalTermData | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: { id: termId, eventId },
      select: {
        accommodationState: { select: { layoutVersion: true } },
        event: {
          select: {
            questions: questionAttributesSelect,
            accommodationRules: {
              select: {
                hardAttribute: true,
                nonDeterminingValues: true,
                softAttributes: true,
                softNeutralValues: true,
              },
            },
            rooms: {
              select: {
                id: true,
                label: true,
                availabilities: {
                  where: { termId },
                  select: {
                    isAvailable: true,
                    baseBeds: true,
                    extraBeds: true,
                  },
                },
              },
            },
          },
        },
        registrationTerms: {
          where: { status: 'confirmed' },
          select: {
            registration: {
              select: {
                id: true,
                receivedAt: true,
                accommodationManualValue: {
                  select: { attribute: true, value: true, basedOnAnswer: true },
                },
              },
            },
          },
        },
      },
    });
    if (!term) return null;
    const rules = term.event.accommodationRules;
    return {
      rules: {
        hardAttribute: hardAttributeFrom(rules, term.event.questions),
        // No rules yet: the list of a new event (#389).
        softAttributes: rules?.softAttributes ?? DEFAULT_SOFT_ATTRIBUTES,
        softNeutralValues: readNeutralValues(rules?.softNeutralValues),
      },
      rooms: term.event.rooms.map((room) => {
        const inTerm = room.availabilities[0];
        return {
          roomId: room.id,
          label: room.label,
          available: inTerm?.isAvailable ?? false,
          baseBeds: inTerm?.baseBeds ?? 0,
          extraBeds: inTerm?.extraBeds ?? 0,
        };
      }),
      people: term.registrationTerms.map(({ registration }) => ({
        registrationId: registration.id,
        receivedAt: registration.receivedAt,
        manualValue: registration.accommodationManualValue,
      })),
      layoutVersion: term.accommodationState?.layoutVersion ?? 0,
    };
  }

  /** `id` is the one a claimed proposal was given; generated otherwise. */
  async createProposal(
    proposal: Omit<RoomProposalModel, 'id'> & { id?: string },
  ): Promise<RoomProposalModel> {
    const row = await this.prisma.accommodationRoomProposal.create({
      data: {
        id: proposal.id,
        eventId: proposal.eventId,
        termId: proposal.termId,
        status: proposal.status,
        triggeredById: proposal.triggeredById,
        solverVersion: proposal.solverVersion,
        input: asJson(proposal.input),
        result:
          proposal.result === null ? Prisma.DbNull : asJson(proposal.result),
        error: proposal.error,
        layoutVersion: proposal.layoutVersion,
        startedAt: proposal.startedAt,
        finishedAt: proposal.finishedAt,
      },
      select: proposalSelect,
    });
    return toProposal(row);
  }
  /** Null when the event is not in an organization of the caller. */
  async findAutomatic(scope: EventScope): Promise<boolean | null> {
    const event = await this.prisma.event.findFirst({
      where: ownedEvent(scope),
      select: { isRoomProposalAutomatic: true },
    });
    return event?.isRoomProposalAutomatic ?? null;
  }

  /**
   * False when the event is not in an organization of the caller. Turning
   * it off drops the proposals a layout change scheduled; a "Navrhnout
   * pokoje" stays. Turning it on schedules nothing by itself.
   */
  async saveAutomatic(scope: EventScope, automatic: boolean): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.event.updateMany({
        where: ownedEvent(scope),
        data: { isRoomProposalAutomatic: automatic },
      });
      if (count !== 1) return false;
      if (!automatic) {
        // The state rows in term order, as termLayoutChanged locks them.
        await tx.$queryRaw`
          SELECT "termId" FROM "accommodation_term_state"
          WHERE "eventId" = ${scope.eventId}::uuid
          ORDER BY "termId" FOR UPDATE`;
        await tx.accommodationTermState.updateMany({
          where: { eventId: scope.eventId, proposalRequestedById: null },
          data: { proposalDueAt: null },
        });
      }
      return true;
    });
  }

  /** The term's proposal state; null for a term of a foreign or missing event. */
  async findTermState(
    scope: EventScope,
    termId: string,
  ): Promise<ProposalTermState | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: { id: termId, eventId: scope.eventId, event: ownedEvent(scope) },
      select: {
        accommodationState: {
          select: {
            layoutVersion: true,
            proposalDueAt: true,
            proposalRunningId: true,
            proposalRequestedById: true,
          },
        },
      },
    });
    if (!term) return null;
    const state = term.accommodationState;
    const latest = await this.findStored(termId, {});
    // A failed or timed-out rerun never hides the last usable proposal.
    const lastSolved =
      latest === null || latest.status === 'solved'
        ? latest
        : await this.findStored(termId, { status: 'solved' });
    const ids = [
      ...new Set(
        [latest, lastSolved].flatMap(
          (p) => p?.input.participants.map((person) => person.id) ?? [],
        ),
      ),
    ];
    const registrations = ids.length
      ? await this.prisma.registration.findMany({
          where: { id: { in: ids }, eventId: scope.eventId },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    return {
      layoutVersion: state?.layoutVersion ?? 0,
      isRunning: Boolean(
        state?.proposalRunningId || state?.proposalRequestedById,
      ),
      scheduledAt: state?.proposalDueAt ?? null,
      latest,
      lastSolved,
      names: new Map(
        registrations.map(({ id, ...name }) => [id, name] as const),
      ),
    };
  }

  /** The newest proposal of the term matching `where`. */
  private async findStored(
    termId: string,
    where: Prisma.AccommodationRoomProposalWhereInput,
  ): Promise<StoredProposal | null> {
    const row = await this.prisma.accommodationRoomProposal.findFirst({
      where: { ...where, termId },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        triggeredBy: { select: { id: true, name: true } },
        startedAt: true,
        finishedAt: true,
        layoutVersion: true,
        input: true,
        result: true,
        applications: {
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 1,
          select: { layoutVersion: true, createdAt: true },
        },
      },
    });
    if (!row) return null;
    const { applications, ...stored } = row;
    const snapshot = row.input as unknown as ProposalSnapshot;
    return {
      ...stored,
      hardAttribute: snapshot.rules.hardAttribute?.attribute ?? null,
      input: snapshot.input,
      result: row.result as RoomProposalResult | null,
      lastApplied: applications[0]
        ? {
            layoutVersion: applications[0].layoutVersion,
            at: applications[0].createdAt,
          }
        : null,
    };
  }
}
