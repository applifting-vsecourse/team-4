import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { ManualValue } from '@/modules/accommodation/domain/effective-value';
import {
  AccommodationRules,
  EvaluationSnapshot,
  NO_RULES,
  TermRoom,
} from '@/modules/accommodation/domain/evaluation-input';
import { Injectable } from '@nestjs/common';

/** What the evaluation of one term reads, before the answers are added. */
export type TermData = {
  rules: AccommodationRules;
  rooms: TermRoom[];
  participants: {
    registrationId: string;
    isConfirmed: boolean;
    receivedAt: Date;
    manualValue: ManualValue | null;
  }[];
  storedOrder: string[] | null;
};

export type RunStatus = 'solved' | 'infeasible' | 'timeout' | 'failed';

/** A stored evaluation of a term (spec v4 §5, §9). */
export type AccommodationRunModel = {
  id: string;
  eventId: string;
  termId: string;
  status: RunStatus;
  triggeredById: string | null;
  solverVersion: string;
  input: EvaluationSnapshot;
  /** The proposal; null for a failed run. */
  result: unknown;
  error: string | null;
  startedAt: Date;
  finishedAt: Date;
};

const runSelect = {
  id: true,
  eventId: true,
  termId: true,
  status: true,
  triggeredById: true,
  solverVersion: true,
  input: true,
  result: true,
  error: true,
  startedAt: true,
  finishedAt: true,
} satisfies Prisma.AccommodationRunSelect;

const toRun = (
  row: Prisma.AccommodationRunGetPayload<{ select: typeof runSelect }>,
): AccommodationRunModel => ({
  ...row,
  input: row.input as unknown as EvaluationSnapshot,
});

const asJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

@Injectable()
export class AccommodationEvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The term as it is now: its available rooms with this term's beds, every
   * active participation, the rules, determinations and a manual order. Null
   * when the term is not one of the event's.
   */
  async findTerm(eventId: string, termId: string): Promise<TermData | null> {
    const term = await this.prisma.eventTerm.findFirst({
      where: { id: termId, eventId },
      select: {
        accommodationOrder: { select: { registrationIds: true } },
        event: {
          select: {
            accommodationRules: {
              select: {
                hardAttribute: true,
                nonDeterminingValues: true,
                softAttributes: true,
              },
            },
          },
        },
        roomAvailabilities: {
          where: { isAvailable: true },
          orderBy: [{ room: { label: 'asc' } }, { roomId: 'asc' }],
          select: {
            roomId: true,
            baseBeds: true,
            extraBeds: true,
            room: { select: { label: true } },
          },
        },
        registrationTerms: {
          where: { status: { not: 'cancelled' } },
          select: {
            status: true,
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
      rules: rules
        ? {
            hardAttribute: rules.hardAttribute
              ? {
                  attribute: rules.hardAttribute,
                  nonDeterminingValues: rules.nonDeterminingValues,
                }
              : null,
            softAttributes: rules.softAttributes,
          }
        : NO_RULES,
      rooms: term.roomAvailabilities.map((availability) => ({
        roomId: availability.roomId,
        label: availability.room.label,
        baseBeds: availability.baseBeds,
        extraBeds: availability.extraBeds,
      })),
      participants: term.registrationTerms.map(({ status, registration }) => ({
        registrationId: registration.id,
        isConfirmed: status === 'confirmed',
        receivedAt: registration.receivedAt,
        manualValue: registration.accommodationManualValue,
      })),
      storedOrder: term.accommodationOrder?.registrationIds ?? null,
    };
  }

  async createRun(
    run: Omit<AccommodationRunModel, 'id'>,
  ): Promise<AccommodationRunModel> {
    const row = await this.prisma.accommodationRun.create({
      data: {
        eventId: run.eventId,
        termId: run.termId,
        status: run.status,
        triggeredById: run.triggeredById,
        solverVersion: run.solverVersion,
        input: asJson(run.input),
        result: run.result === null ? Prisma.DbNull : asJson(run.result),
        error: run.error,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
      },
      select: runSelect,
    });
    return toRun(row);
  }
}
