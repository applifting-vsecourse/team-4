import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import {
  answerOf,
  DeterminationRefusal,
  refuseDetermination,
} from '@/modules/accommodation/domain/determination';
import {
  effectiveValue,
  HardAttribute,
} from '@/modules/accommodation/domain/effective-value';
import { termInputsChanged } from '@/modules/accommodation/repositories/term-inputs';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable } from '@nestjs/common';

type Db = Prisma.TransactionClient;

export type Actor = { id: string; name: string };

/** The determination as stored; `isValid` while the answer is the one it was made on. */
export type Determination = {
  value: string;
  basedOnAnswer: string | null;
  reason: string;
  createdAt: Date;
  createdBy: Actor;
  isValid: boolean;
};

/** One determination in the immutable audit (F39-1). */
export type DeterminationRecord = {
  id: string;
  createdAt: Date;
  actor: Actor;
  reason: string;
  /** The answer it was made on. */
  answer: string | null;
  /** The valid determination it replaced; null when there was none. */
  previousValue: string | null;
  value: string;
};

export type RegistrationAccommodation = {
  hardAttribute: HardAttribute | null;
  answer: string | null;
  determination: Determination | null;
  effectiveValue: string | null;
  /** Newest first. */
  history: DeterminationRecord[];
};

export type DeterminationOutcome =
  | { kind: 'determined' }
  | { kind: 'not_found' }
  /** The answer is not the one the organizer decided on. */
  | { kind: 'answer_changed' }
  | { kind: 'refused'; refusal: DeterminationRefusal };

/** What an intervention of kind `manual_value` stores before and after. */
type Snapshot = { answer: string | null; value: string | null };

const inScope = (scope: EventScope): Prisma.RegistrationWhereInput => ({
  eventId: scope.eventId,
  organizationId: scope.organizationId,
  event: { organization: { ownerId: scope.ownerId } },
});

const hardAttributeOf = (
  rules: {
    hardAttribute: string | null;
    nonDeterminingValues: string[];
  } | null,
): HardAttribute | null =>
  rules?.hardAttribute
    ? {
        attribute: rules.hardAttribute,
        nonDeterminingValues: rules.nonDeterminingValues,
      }
    : null;

@Injectable()
export class RegistrationAccommodationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null for a registration of another event, organization or owner. */
  async find(
    scope: EventScope,
    registrationId: string,
  ): Promise<RegistrationAccommodation | null> {
    const row = await this.prisma.registration.findFirst({
      where: { id: registrationId, ...inScope(scope) },
      select: {
        gender: true,
        event: {
          select: {
            accommodationRules: {
              select: { hardAttribute: true, nonDeterminingValues: true },
            },
          },
        },
        accommodationManualValue: {
          select: {
            value: true,
            basedOnAnswer: true,
            reason: true,
            createdAt: true,
            createdBy: { select: { id: true, name: true } },
          },
        },
        accommodationInterventions: {
          where: { kind: 'manual_value' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            createdAt: true,
            reason: true,
            before: true,
            after: true,
            actor: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!row) return null;
    const hard = hardAttributeOf(row.event.accommodationRules);
    const answer = hard ? answerOf(hard.attribute, row) : null;
    const manual = row.accommodationManualValue;
    return {
      hardAttribute: hard,
      answer,
      determination: manual && {
        value: manual.value,
        basedOnAnswer: manual.basedOnAnswer,
        reason: manual.reason,
        createdAt: manual.createdAt,
        createdBy: manual.createdBy,
        isValid: manual.basedOnAnswer === answer,
      },
      effectiveValue: effectiveValue(hard, answer, manual),
      history: row.accommodationInterventions.map((record) => {
        const before = record.before as Snapshot;
        const after = record.after as Snapshot;
        return {
          id: record.id,
          createdAt: record.createdAt,
          actor: record.actor,
          reason: record.reason,
          answer: after.answer,
          previousValue: before.value,
          value: after.value as string,
        };
      }),
    };
  }

  /**
   * Determines the effective value for every term of the registration, with
   * an immutable record of who, when, why, before and after. The registration
   * is locked like a participant change, so the answer it is made on cannot
   * change meanwhile. The registration's terms get a new input version, so
   * their proposals turn stale (spec v4 §5). The same value again records
   * nothing.
   */
  async determine(
    scope: EventScope,
    registrationId: string,
    input: {
      value: string;
      reason: string;
      /** The answer the organizer saw. */
      answer: string | null;
      actorId: string;
    },
  ): Promise<DeterminationOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.registration.findFirst({
        where: { id: registrationId, ...inScope(scope) },
        select: { id: true },
      });
      if (!owned) return { kind: 'not_found' };
      return this.determineWithin(tx, registrationId, input);
    });
  }

  /**
   * The determination inside the caller's transaction (also used when a
   * decision determines in the same step). The registration must already be
   * known to belong to the scope.
   */
  async determineWithin(
    tx: Db,
    registrationId: string,
    input: {
      value: string;
      reason: string;
      answer: string | null;
      actorId: string;
    },
  ): Promise<DeterminationOutcome> {
    await tx.$queryRaw`
        SELECT "id" FROM "registration"
        WHERE "id" = ${registrationId}::uuid FOR UPDATE`;
    const row = await tx.registration.findUniqueOrThrow({
      where: { id: registrationId },
      select: {
        eventId: true,
        gender: true,
        event: {
          select: {
            accommodationRules: {
              select: { hardAttribute: true, nonDeterminingValues: true },
            },
          },
        },
        accommodationManualValue: {
          select: { value: true, basedOnAnswer: true },
        },
        terms: {
          where: { status: { not: 'cancelled' } },
          select: { termId: true },
        },
      },
    });
    const hard = hardAttributeOf(row.event.accommodationRules);
    const answer = hard ? answerOf(hard.attribute, row) : null;
    if (hard && answer !== input.answer) return { kind: 'answer_changed' };
    const refusal = refuseDetermination(hard, answer, input.value);
    if (refusal) return { kind: 'refused', refusal };

    const current = row.accommodationManualValue;
    const previousValue =
      current && current.basedOnAnswer === answer ? current.value : null;
    if (previousValue === input.value) return { kind: 'determined' };

    // The determination and its record carry the same moment.
    const now = new Date();
    await tx.accommodationManualValue.upsert({
      where: { registrationId },
      create: {
        registrationId,
        eventId: row.eventId,
        value: input.value,
        basedOnAnswer: answer,
        reason: input.reason,
        createdById: input.actorId,
        createdAt: now,
      },
      update: {
        value: input.value,
        basedOnAnswer: answer,
        reason: input.reason,
        createdById: input.actorId,
        createdAt: now,
      },
    });
    await this.record(tx, {
      createdAt: now,
      eventId: row.eventId,
      registrationId,
      actorId: input.actorId,
      reason: input.reason,
      before: { answer, value: previousValue },
      after: { answer, value: input.value },
    });
    await termInputsChanged(
      tx,
      row.eventId,
      row.terms.map((term) => term.termId),
    );
    return { kind: 'determined' };
  }

  private async record(
    tx: Db,
    record: {
      createdAt: Date;
      eventId: string;
      registrationId: string;
      actorId: string;
      reason: string;
      before: Snapshot;
      after: Snapshot;
    },
  ): Promise<void> {
    await tx.accommodationIntervention.create({
      data: { ...record, kind: 'manual_value', termId: null },
    });
  }
}
