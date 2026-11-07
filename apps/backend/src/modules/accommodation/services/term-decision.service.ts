import { refuseDetermination } from '@/modules/accommodation/domain/determination';
import { effectiveValue } from '@/modules/accommodation/domain/effective-value';
import { buildEvaluation } from '@/modules/accommodation/domain/evaluation-input';
import { DecisionRefusal } from '@/modules/accommodation/domain/term-decision';
import { AccommodationEvaluationRepository } from '@/modules/accommodation/repositories/accommodation-evaluation.repository';
import {
  BulkOutcome,
  DecideOutcome,
  DecisionRecord,
  TermDecisionRepository,
} from '@/modules/accommodation/repositories/term-decision.repository';
import { TermEvaluationRepository } from '@/modules/accommodation/repositories/term-evaluation.repository';
import { HardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import { solveAssignmentInWorker } from '@/modules/accommodation/solver/solver-runner';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

const conflict = (code: string, message: string): ConflictException =>
  new ConflictException({ statusCode: 409, code, message });

const REFUSALS: Record<DecisionRefusal, () => Error> = {
  proposal_stale: () =>
    conflict(
      'proposal_stale',
      'Podklady, kapacita nebo přípustnost se od zobrazení návrhu změnily. ' +
        'Nikdo nebyl potvrzen, načtěte aktuální návrh.',
    ),
  proposal_unavailable: () =>
    conflict(
      'proposal_unavailable',
      'Z tohoto výpočtu nelze potvrzovat. Načtěte aktuální návrh.',
    ),
  nothing_to_confirm: () =>
    conflict('nothing_to_confirm', 'Návrh neobsahuje žádnou vhodnou osobu.'),
  not_undecided: () =>
    conflict(
      'not_undecided',
      'Účast této osoby už je potvrzená nebo ji nelze v termínu rozhodnout.',
    ),
  already_waitlisted: () =>
    conflict('already_waitlisted', 'Osoba už je mezi náhradníky.'),
  determination_required: () =>
    new BadRequestException({
      statusCode: 400,
      code: 'determination_required',
      field: 'determination',
      message: 'Před potvrzením určete ubytování a uveďte důvod.',
    }),
  no_capacity: () =>
    conflict(
      'no_capacity',
      'V termínu není dost volné kapacity, účast nebyla potvrzena.',
    ),
  incompatible_rooms: () =>
    conflict(
      'incompatible_rooms',
      'Osobu nelze ubytovat spolu s již potvrzenými, účast nebyla potvrzena.',
    ),
};

const keyReused = (): ConflictException =>
  conflict(
    'submission_key_reused',
    'Toto rozhodnutí už bylo odesláno s jinými údaji. Načtěte stránku znovu.',
  );

/** How often a decision checks again when the term moves under it. */
const ATTEMPTS = 3;

export type Determination = {
  value: string;
  reason: string;
  answer: string | null;
};

/**
 * Decisions on participation in a term (S3-02, spec v4 §3). The proposal is
 * the organizer's to act on: it is confirmed as a whole, or one person is
 * confirmed or waitlisted, with the capacity and rules checked as the solver
 * does. Nothing here recalculates, assigns a room or sends anything.
 */
@Injectable()
export class TermDecisionService {
  constructor(
    private readonly decisions: TermDecisionRepository,
    private readonly terms: AccommodationEvaluationRepository,
    private readonly termScope: TermEvaluationRepository,
    private readonly answers: HardAttributeAnswers,
  ) {}

  /** Confirms the suitable people of the run, or nobody. */
  async confirmProposal(
    scope: EventScope,
    termId: string,
    input: { runId: string; submissionKey: string },
  ): Promise<Extract<BulkOutcome, { kind: 'confirmed' }>> {
    const outcome = await this.decisions.confirmProposal(scope, termId, {
      ...input,
      actorId: scope.ownerId,
    });
    switch (outcome.kind) {
      case 'confirmed':
        return outcome;
      case 'not_found':
        throw notAvailable();
      case 'key_reused':
        throw keyReused();
      case 'refused':
        throw REFUSALS[outcome.refusal]();
    }
  }

  /** Confirms or waitlists one person in one term. */
  async decide(
    scope: EventScope,
    termId: string,
    registrationId: string,
    input: {
      decision: 'confirm' | 'waitlist';
      determination?: Determination;
      submissionKey: string;
    },
  ): Promise<{ status: 'confirmed' | 'waitlisted' }> {
    if (!(await this.termScope.isTermInScope(scope, termId))) {
      throw notAvailable();
    }
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      // The version first: a change after it is caught under the lock.
      const expectedVersion = await this.decisions.inputVersion(termId);
      // A repeat of a saved request is answered by the repository's replay,
      // not refused because the person is confirmed by now.
      const isRepeat = await this.decisions.isSaved(input.submissionKey);
      if (isRepeat) {
        // Nothing to check.
      } else if (input.decision === 'confirm') {
        await this.checkConfirmation(
          scope,
          termId,
          registrationId,
          input.determination,
        );
      } else if (input.determination) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'determination_not_needed',
          field: 'determination',
          message: 'Zařazení mezi náhradníky určení ubytování nevyžaduje.',
        });
      }
      const outcome = await this.decisions.decide(
        scope,
        termId,
        registrationId,
        {
          ...input,
          expectedVersion,
          actorId: scope.ownerId,
        },
      );
      switch (outcome.kind) {
        case 'decided':
          return { status: outcome.status as 'confirmed' | 'waitlisted' };
        case 'changed':
          continue;
        case 'not_found':
          throw notAvailable();
        case 'key_reused':
          throw keyReused();
        case 'refused':
          throw REFUSALS[outcome.refusal]();
        case 'determination_failed':
          throw this.determinationFailure(outcome.outcome);
      }
    }
    throw conflict(
      'term_changed',
      'Termín se mezitím změnil. Načtěte aktuální stav a zkuste to znovu.',
    );
  }

  async history(
    scope: EventScope,
    registrationId: string,
  ): Promise<DecisionRecord[]> {
    const history = await this.decisions.history(scope, registrationId);
    if (!history) throw notAvailable();
    return history;
  }

  /**
   * Whether the person fits the term as the solver sees it: confirmed with
   * the people already confirmed, in the rooms of the term. Throws the
   * refusal when not; saves nothing.
   */
  private async checkConfirmation(
    scope: EventScope,
    termId: string,
    registrationId: string,
    determination: Determination | undefined,
  ): Promise<void> {
    const term = await this.terms.findTerm(scope.eventId, termId);
    const person = term?.participants.find(
      (participant) => participant.registrationId === registrationId,
    );
    if (!term || !person) throw notAvailable();
    if (person.isConfirmed) throw REFUSALS.not_undecided();

    const hard = term.rules.hardAttribute;
    const answers = hard
      ? await this.answers.answers(
          scope.eventId,
          hard.attribute,
          term.participants.map((participant) => participant.registrationId),
        )
      : new Map<string, string | null>();
    const answer = answers.get(registrationId) ?? null;

    let manualValue = person.manualValue;
    const needsValue =
      hard !== null && effectiveValue(hard, answer, manualValue) === null;
    if (needsValue && !determination) throw REFUSALS.determination_required();
    if (determination) {
      // Only a person without an effective value is determined, and only
      // for the answer the organizer saw.
      if (!hard) {
        throw this.determinationFailure({
          kind: 'refused',
          refusal: 'no_hard_attribute',
        });
      }
      if (!needsValue) {
        throw this.determinationFailure({
          kind: 'refused',
          refusal: 'determination_not_needed',
        });
      }
      if (answer !== determination.answer) {
        throw this.determinationFailure({ kind: 'answer_changed' });
      }
      const refusal = refuseDetermination(hard, answer, determination.value);
      if (refusal) {
        throw this.determinationFailure({ kind: 'refused', refusal });
      }
      manualValue = { value: determination.value, basedOnAnswer: answer };
    }

    const { input } = buildEvaluation(
      term.rules,
      term.rooms,
      term.participants.map((participant) => ({
        ...participant,
        isConfirmed:
          participant.isConfirmed ||
          participant.registrationId === registrationId,
        manualValue:
          participant.registrationId === registrationId
            ? manualValue
            : participant.manualValue,
        answer: answers.get(participant.registrationId) ?? null,
      })),
      term.storedOrder,
    );
    // Only the confirmed set has to fit; nobody else is being decided.
    const result = await solveAssignmentInWorker(
      { ...input, candidates: [] },
      { phase: 1 },
    );
    if (result.status === 'timeout') {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'check_unavailable',
        message: 'Kapacitu se nepodařilo ověřit. Zkuste to znovu.',
      });
    }
    if (result.status === 'infeasible') {
      throw result.constraint === 'capacity'
        ? REFUSALS.no_capacity()
        : REFUSALS.incompatible_rooms();
    }
  }

  private determinationFailure(
    outcome: Extract<
      DecideOutcome,
      { kind: 'determination_failed' }
    >['outcome'],
  ): Error {
    if (outcome.kind === 'answer_changed') {
      return conflict(
        'answer_changed',
        'Účastník mezitím změnil odpověď. Načtěte ji znovu.',
      );
    }
    if (outcome.kind === 'refused') {
      return outcome.refusal === 'value_invalid'
        ? new BadRequestException({
            statusCode: 400,
            code: 'value_invalid',
            field: 'determination.value',
            message: 'Vyberte jednu z nabízených hodnot.',
          })
        : conflict(
            outcome.refusal,
            outcome.refusal === 'no_hard_attribute'
              ? 'Akce nemá pravidlo, podle kterého se ubytování určuje.'
              : 'Odpověď účastníka už ubytování určuje.',
          );
    }
    return notAvailable();
  }
}
