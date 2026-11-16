import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { ManualValue } from '@/modules/accommodation/domain/effective-value';
import {
  ProposalRules,
  ProposalSnapshot,
  ProposalTermRoom,
} from '@/modules/accommodation/domain/proposal-input';
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

export type ProposalStatus = 'solved' | 'timeout' | 'failed';

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
            accommodationRules: {
              select: {
                hardAttribute: true,
                nonDeterminingValues: true,
                softAttributes: true,
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
                  select: { value: true, basedOnAnswer: true },
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
        hardAttribute: rules?.hardAttribute
          ? {
              attribute: rules.hardAttribute,
              nonDeterminingValues: rules.nonDeterminingValues,
            }
          : null,
        softAttributes: rules?.softAttributes ?? [],
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
}
