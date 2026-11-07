import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  ChangePlan,
  ChangeProposal,
} from '@/modules/registrations/domain/registration-change';
import {
  ChangePreview,
  DecisionOutcome,
  PreviewOutcome,
  RegistrationChangeModel,
  RegistrationChangesRepository,
  SubmitOutcome,
} from '@/modules/registrations/repositories/registration-changes.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const conflict = (
  code: string,
  message: string,
  extra: object = {},
): ConflictException =>
  new ConflictException({ statusCode: 409, code, message, ...extra });

const unavailable = (): NotFoundException =>
  new NotFoundException({
    statusCode: 404,
    code: 'registration_unavailable',
    message: 'Přihláška není dostupná.',
  });

const PENDING = conflict(
  'change_pending',
  'Přihláška má nevyřízenou žádost o změnu.',
);

type Failure = Exclude<
  SubmitOutcome | DecisionOutcome | PreviewOutcome,
  { kind: 'applied' | 'requested' | 'decided' | 'already_decided' | 'preview' }
>;

/** The fresh review that comes with a refusal, in the shape of the preview endpoint. */
const previewOf = (plan: ChangePlan, version = 0): object => ({
  version,
  requiresApproval: plan.requiresApproval,
  kinds: plan.kinds,
  moves: plan.moves.map(
    ({ fromTermId, toTermId, resultStatus, requiresReleaseConsent }) => ({
      fromTermId,
      toTermId,
      resultStatus,
      requiresReleaseConsent,
    }),
  ),
  summary: plan.summary,
});

/** The answer for everything that is not a success. */
const refuse = (outcome: Failure, version?: number): Error => {
  switch (outcome.kind) {
    case 'not_found':
      return unavailable();
    case 'stale':
      return conflict(
        'registration_stale',
        'Přihláška se mezitím změnila. Načtěte ji znovu a změnu potvrďte.',
      );
    case 'change_pending':
      return PENDING;
    case 'conflict':
      return conflict(
        'change_already_decided',
        'O žádosti už bylo rozhodnuto jinak.',
      );
    case 'approval_changed':
      return conflict(
        'approval_changed',
        'Pravidla schvalování se mezitím změnila. Zkontrolujte změnu znovu.',
        { preview: previewOf(outcome.plan, version) },
      );
    case 'release_consent_required':
      return conflict(
        'release_consent_required',
        'Přesunem přijdete o potvrzené místo a nový termín čeká na rozhodnutí organizátora. Je potřeba váš souhlas.',
        { preview: previewOf(outcome.plan, version) },
      );
    case 'invalid':
      return new BadRequestException({
        statusCode: 400,
        code: outcome.error.code,
        message: outcome.error.message,
      });
  }
};

@Injectable()
export class RegistrationChangesService {
  constructor(private readonly repository: RegistrationChangesRepository) {}

  // ─── Participant ──────────────────────────────────────────────────────────

  async preview(
    accountId: string,
    registrationId: string,
    proposal: ChangeProposal,
  ): Promise<ChangePreview> {
    const outcome = await this.repository.preview(
      accountId,
      registrationId,
      proposal,
    );
    if (outcome.kind === 'preview') return outcome.preview;
    throw refuse(outcome);
  }

  async submit(
    accountId: string,
    registrationId: string,
    input: {
      proposal: ChangeProposal;
      expectedVersion: number;
      expectsApproval: boolean;
    },
  ): Promise<{
    outcome: 'applied' | 'requested';
    change: RegistrationChangeModel;
  }> {
    const outcome = await this.repository.submit(
      accountId,
      registrationId,
      input,
      new Date(),
    );
    if (outcome.kind === 'applied' || outcome.kind === 'requested') {
      return { outcome: outcome.kind, change: outcome.change };
    }
    throw refuse(outcome, input.expectedVersion);
  }

  async listOwn(
    accountId: string,
    registrationId: string,
  ): Promise<RegistrationChangeModel[]> {
    const changes = await this.repository.findOwn(accountId, registrationId);
    if (!changes) throw unavailable();
    return changes;
  }

  // ─── Organizer ────────────────────────────────────────────────────────────

  async listPending(scope: EventScope): Promise<RegistrationChangeModel[]> {
    const changes = await this.repository.findPending(scope);
    if (!changes) throw notAvailable();
    return changes;
  }

  async listManaged(
    scope: EventScope,
    registrationId: string,
  ): Promise<RegistrationChangeModel[]> {
    const changes = await this.repository.findManaged(scope, registrationId);
    if (!changes) throw notAvailable();
    return changes;
  }

  async approve(
    scope: EventScope,
    registrationId: string,
    changeId: string,
  ): Promise<RegistrationChangeModel> {
    const outcome = await this.repository.approve(
      scope,
      registrationId,
      changeId,
      new Date(),
    );
    return this.decided(outcome);
  }

  async reject(
    scope: EventScope,
    registrationId: string,
    changeId: string,
  ): Promise<RegistrationChangeModel> {
    const outcome = await this.repository.reject(
      scope,
      registrationId,
      changeId,
      new Date(),
    );
    return this.decided(outcome);
  }

  private decided(outcome: DecisionOutcome): RegistrationChangeModel {
    if (outcome.kind === 'decided' || outcome.kind === 'already_decided') {
      return outcome.change;
    }
    if (outcome.kind === 'not_found') throw notAvailable();
    if (outcome.kind === 'invalid') {
      throw conflict(
        'change_invalid',
        'Žádost už nejde provést, protože se přihláška nebo akce změnila.',
      );
    }
    throw refuse(outcome);
  }
}

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');
