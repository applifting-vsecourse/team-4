import { randomUUID } from 'node:crypto';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { PrismaService } from '@/core/prisma/prisma.service';
import { AccommodationRulesController } from '@/modules/accommodation/controllers/accommodation-rules.controller';
import { AccommodationRulesRepository } from '@/modules/accommodation/repositories/accommodation-rules.repository';
import { AccommodationRulesService } from '@/modules/accommodation/services/accommodation-rules.service';
import { RegistrationHardAttributeAnswers } from '@/modules/accommodation/services/hard-attribute-answers';
import { EventRegistrationsController } from '@/modules/registrations/controllers/event-registrations.controller';
import { ParticipantRegistrationsController } from '@/modules/registrations/controllers/participant-registrations.controller';
import { PublicRegistrationsController } from '@/modules/registrations/controllers/public-registrations.controller';
import { RegistrationQuestionsController } from '@/modules/registrations/controllers/registration-questions.controller';
import { questionsVersion } from '@/modules/registrations/domain/questions';
import { EventRegistrationsRepository } from '@/modules/registrations/repositories/event-registrations.repository';
import { ParticipantRegistrationsRepository } from '@/modules/registrations/repositories/participant-registrations.repository';
import { RegistrationChangesRepository } from '@/modules/registrations/repositories/registration-changes.repository';
import { RegistrationQuestionsRepository } from '@/modules/registrations/repositories/registration-questions.repository';
import { RegistrationsRepository } from '@/modules/registrations/repositories/registrations.repository';
import { EventRegistrationsService } from '@/modules/registrations/services/event-registrations.service';
import { ParticipantRegistrationsService } from '@/modules/registrations/services/participant-registrations.service';
import { RegistrationChangesService } from '@/modules/registrations/services/registration-changes.service';
import { RegistrationQuestionsService } from '@/modules/registrations/services/registration-questions.service';
import { RegistrationsService } from '@/modules/registrations/services/registrations.service';
import { confirmationProviders, Mailbox } from '@/testing/confirmation-mail';
import {
  CreatedEvent,
  createEvent,
  createOrganization,
  createOrganizer,
  createRegistration,
} from '@/testing/factories';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// #485 through the HTTP API against a real database: the organizer's
// categorical questions, the answers on the public form and in a change of
// the registration, and a question as the hard attribute. Guards are
// replaced: `x-test-user` names the organizer, `x-test-account` the
// participant. Needs a migrated Postgres in DATABASE_URL: `pnpm backend test:db`.

jest.mock('@/core/email/render', () => ({
  renderEmail: (_template: unknown, props: object): Promise<string> =>
    Promise.resolve(JSON.stringify(props)),
}));

jest.mock('@/shared/auth/guards/authenticated-user.guard', () => ({
  AuthenticatedUserGuard: class {
    canActivate(context: {
      switchToHttp: () => {
        getRequest: () => {
          headers: Record<string, unknown>;
          session?: { user: { id: string } };
        };
      };
    }): boolean {
      const request = context.switchToHttp().getRequest();
      const id = request.headers['x-test-user'];
      if (typeof id !== 'string') return false;
      request.session = { user: { id } };
      return true;
    }
  },
}));

jest.mock(
  '@/modules/participant-access/guards/participant-session.guard',
  () => ({
    ParticipantSessionGuard: class {
      canActivate(context: {
        switchToHttp: () => {
          getRequest: () => {
            headers: Record<string, unknown>;
            participant?: { accountId: string; email: string };
          };
        };
      }): boolean {
        const request = context.switchToHttp().getRequest();
        const id = request.headers['x-test-account'];
        if (typeof id !== 'string') return false;
        request.participant = { accountId: id, email: 'x@example.test' };
        return true;
      }
    },
    CurrentParticipant: jest
      .requireActual<typeof import('@nestjs/common')>('@nestjs/common')
      .createParamDecorator(
        (_data: unknown, context: ExecutionContext) =>
          context.switchToHttp().getRequest<{ participant?: unknown }>()
            .participant,
      ),
  }),
);

let app: INestApplication;
let baseUrl: string;
let prisma: PrismaService;
let answers: RegistrationHardAttributeAnswers;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [PrismaModule],
    controllers: [
      RegistrationQuestionsController,
      PublicRegistrationsController,
      ParticipantRegistrationsController,
      EventRegistrationsController,
      AccommodationRulesController,
    ],
    providers: [
      RegistrationQuestionsService,
      RegistrationQuestionsRepository,
      RegistrationsService,
      RegistrationsRepository,
      ParticipantRegistrationsService,
      ParticipantRegistrationsRepository,
      RegistrationChangesService,
      RegistrationChangesRepository,
      EventRegistrationsService,
      EventRegistrationsRepository,
      AccommodationRulesService,
      AccommodationRulesRepository,
      RegistrationHardAttributeAnswers,
      ...confirmationProviders(new Mailbox()),
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  baseUrl = await app.getUrl();
  prisma = app.get(PrismaService);
  answers = app.get(RegistrationHardAttributeAnswers);
});

afterAll(() => app.close());

type Call = { status: number; body: any };

const call = async (
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  who: { account?: string; user?: string },
  body?: unknown,
): Promise<Call> => {
  const response = await fetch(`${baseUrl}/${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(who.account ? { 'x-test-account': who.account } : {}),
      ...(who.user ? { 'x-test-user': who.user } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const inDays = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

type Fixture = CreatedEvent & {
  ownerId: string;
  organizationId: string;
  questionsPath: string;
  save: (questions: unknown[]) => Promise<Call>;
};

const setup = async (): Promise<Fixture> => {
  const owner = await createOrganizer(prisma);
  const organization = await createOrganization(prisma, { ownerId: owner.id });
  const created = await createEvent(prisma, {
    organizationId: organization.id,
    status: 'open',
    terms: [
      {
        label: 'Turnus 1',
        startDate: inDays(60),
        endDate: inDays(66),
        priceMinor: 0,
      },
    ],
    rooms: [{ baseBeds: 4, termIndexes: [0] }],
  });
  const questionsPath = `organizations/${organization.id}/events/${created.event.id}/questions`;
  return {
    ...created,
    ownerId: owner.id,
    organizationId: organization.id,
    questionsPath,
    save: (questions) =>
      call('PUT', questionsPath, { user: owner.id }, { questions }),
  };
};

const SCHOOL = {
  label: 'Škola',
  isRequired: true,
  options: [{ label: 'ZŠ Lipová' }, { label: 'ZŠ Dubová' }],
};

/** The question list as the organizer saves it back unchanged. */
const asDrafts = (questions: any[]): unknown[] =>
  questions.map((q) => ({
    id: q.id,
    label: q.label,
    isRequired: q.isRequired,
    options: q.options.map((o: any) => ({ id: o.id, label: o.label })),
  }));

const submit = (f: Fixture, extra: Record<string, unknown> = {}) =>
  call(
    'POST',
    `public/events/${f.event.publicId}/registrations`,
    {},
    {
      submissionKey: randomUUID(),
      firstName: 'Jana',
      lastName: 'Nováková',
      email: `jana-${randomUUID().slice(0, 8)}@example.test`,
      phone: '+420 777 123 456',
      termIds: [f.terms[0].id],
      ...extra,
    },
  );

describe('Otázky v přihlášce', () => {
  it('saves questions in order and keeps ids when renamed', async () => {
    const f = await setup();
    const saved = await f.save([
      SCHOOL,
      {
        label: 'Družina',
        isRequired: false,
        options: [{ label: 'Lišky' }, { label: 'Vlci' }, { label: 'Sovy' }],
      },
    ]);
    expect(saved.status).toBe(200);
    expect(
      saved.body.questions.map((q: any) => [
        q.label,
        q.isRequired,
        q.options.map((o: any) => o.label),
      ]),
    ).toEqual([
      ['Škola', true, ['ZŠ Lipová', 'ZŠ Dubová']],
      ['Družina', false, ['Lišky', 'Vlci', 'Sovy']],
    ]);

    const [school, troop] = saved.body.questions;
    const renamed = await f.save([
      asDrafts([troop])[0],
      {
        ...(asDrafts([school])[0] as object),
        label: 'Kterou školu navštěvuješ?',
        options: [
          { id: school.options[0].id, label: 'Lipová' },
          { id: school.options[1].id, label: 'Dubová' },
          { label: 'Jiná' },
        ],
      },
    ]);
    expect(renamed.status).toBe(200);
    expect(renamed.body.questions[1]).toMatchObject({
      id: school.id,
      label: 'Kterou školu navštěvuješ?',
      options: [
        { id: school.options[0].id, label: 'Lipová' },
        { id: school.options[1].id, label: 'Dubová' },
        { label: 'Jiná' },
      ],
    });
    expect(renamed.body.questions[0].id).toBe(troop.id);
  });

  it.each([
    ['six questions', Array.from({ length: 6 }, () => SCHOOL)],
    ['one option', [{ ...SCHOOL, options: [{ label: 'Jen jedna' }] }]],
    [
      'repeated options',
      [{ ...SCHOOL, options: [{ label: 'A' }, { label: 'a' }] }],
    ],
    ['a blank question', [{ ...SCHOOL, label: '  ' }]],
  ])('refuses %s', async (_name, questions) => {
    const f = await setup();
    const refused = await f.save(questions);
    expect(refused.status).toBe(400);
    expect(
      (await call('GET', f.questionsPath, { user: f.ownerId })).body,
    ).toEqual({ questions: [] });
  });

  it('keeps answered questions and chosen options, and questions the rules use', async () => {
    const f = await setup();
    const { body } = await f.save([
      SCHOOL,
      { ...SCHOOL, label: 'Oddíl', isRequired: false },
    ]);
    const [school, troop] = body.questions;
    expect(
      (
        await submit(f, {
          answers: [{ questionId: school.id, optionId: school.options[0].id }],
        })
      ).status,
    ).toBe(201);

    const after = (await call('GET', f.questionsPath, { user: f.ownerId })).body
      .questions;
    expect(after[0]).toMatchObject({ isAnswered: true, usedBy: null });
    expect(after[0].options.map((o: any) => o.isChosen)).toEqual([true, false]);

    // The answered question stays; the chosen option stays, the other may go.
    const removeQuestion = await f.save(asDrafts([troop]));
    expect(removeQuestion.status).toBe(409);
    expect(removeQuestion.body.code).toBe('question_answered');
    const [schoolDraft, troopDraft] = asDrafts([school, troop]) as any[];
    const removeChosen = await f.save([
      { ...schoolDraft, options: [schoolDraft.options[1], { label: 'Nová' }] },
      troopDraft,
    ]);
    expect(removeChosen.body.code).toBe('option_chosen');
    expect(
      (
        await f.save([
          {
            ...schoolDraft,
            options: [schoolDraft.options[0], { label: 'Nová' }],
          },
          troopDraft,
        ])
      ).status,
    ).toBe(200);

    // Unanswered, but the hard attribute: it keeps its options and stays.
    const rules = `organizations/${f.organizationId}/events/${f.event.id}/accommodation/hard-attribute`;
    expect(
      (
        await call(
          'PUT',
          rules,
          { user: f.ownerId },
          { hardAttribute: troop.id },
        )
      ).status,
    ).toBe(200);
    const current = (await call('GET', f.questionsPath, { user: f.ownerId }))
      .body.questions;
    expect(current[1].usedBy).toBe('hard');
    const inUse = await f.save(asDrafts([current[0]]));
    expect(inUse.status).toBe(409);
    expect(inUse.body.code).toBe('question_in_use');
  });

  it('is only for the organizer of the event', async () => {
    const f = await setup();
    const stranger = await createOrganizer(prisma);
    expect(
      (await call('GET', f.questionsPath, { user: stranger.id })).status,
    ).toBe(404);
    expect(
      (
        await call(
          'PUT',
          f.questionsPath,
          { user: stranger.id },
          { questions: [SCHOOL] },
        )
      ).status,
    ).toBe(404);
  });
});

describe('answers on the public form', () => {
  it('needs the required answers and refuses a changed form', async () => {
    const f = await setup();
    const [school] = (await f.save([SCHOOL])).body.questions;

    const missing = await submit(f);
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe('answer_required');
    const unknown = await submit(f, {
      answers: [{ questionId: school.id, optionId: randomUUID() }],
    });
    expect(unknown.status).toBe(409);
    expect(unknown.body.code).toBe('questions_changed');

    // A form opened before a rename sends the version it showed.
    const shown = questionsVersion([school]);
    const [renamedSchool] = (
      await f.save([
        { ...(asDrafts([school])[0] as object), label: 'Základní škola' },
      ])
    ).body.questions;
    const renamed = await submit(f, {
      answers: [{ questionId: school.id, optionId: school.options[1].id }],
      questionsVersion: shown,
    });
    expect(renamed.status).toBe(409);
    expect(renamed.body.code).toBe('questions_changed');

    const current = questionsVersion([renamedSchool]);
    const saved = await submit(f, {
      answers: [{ questionId: school.id, optionId: school.options[1].id }],
      questionsVersion: current,
    });
    expect(saved.status).toBe(201);
    expect(
      await prisma.registrationAnswer.findMany({
        where: { registrationId: saved.body.id },
        select: { questionId: true, optionId: true },
      }),
    ).toEqual([{ questionId: school.id, optionId: school.options[1].id }]);
  });
});

describe('answers of the participant and the organizer', () => {
  it('shows the answers, changes them in a change and asks for a required one added later', async () => {
    const f = await setup();
    const registration = await createRegistration(prisma, {
      event: f.event,
      terms: [{ term: f.terms[0], status: 'confirmed' }],
    });
    const own = { account: registration.participantAccountId };
    const path = `participant/registrations/${registration.id}`;
    // A required question added after the registration.
    const [school] = (await f.save([SCHOOL])).body.questions;

    const detail = await call('GET', path, own);
    expect(detail.body.questions.map((q: any) => q.label)).toEqual(['Škola']);
    expect(detail.body.answers).toEqual([]);
    expect(detail.body.missingAnswers).toEqual([school.id]);

    // Any other change waits for the answer.
    const blocked = await call('POST', `${path}/changes/preview`, own, {
      moves: [],
      cancelledTermIds: [],
      phone: '+420731987654',
    });
    expect(blocked.status).toBe(400);
    expect(blocked.body.code).toBe('answer_required');
    // A cancellation does not wait for it; with another change it does.
    const cancel = { moves: [], cancelledTermIds: [f.terms[0].id] };
    expect(
      (await call('POST', `${path}/changes/preview`, own, cancel)).status,
    ).toBe(200);
    expect(
      (
        await call('POST', `${path}/changes/preview`, own, {
          ...cancel,
          phone: '+420731987654',
        })
      ).body.code,
    ).toBe('answer_required');

    const proposal = {
      moves: [],
      cancelledTermIds: [],
      phone: '+420731987654',
      answers: [{ questionId: school.id, optionId: school.options[0].id }],
    };
    const preview = await call(
      'POST',
      `${path}/changes/preview`,
      own,
      proposal,
    );
    expect(preview.status).toBe(200);
    expect(preview.body.summary.answers).toEqual([
      {
        questionId: school.id,
        question: 'Škola',
        original: null,
        proposed: { optionId: school.options[0].id, label: 'ZŠ Lipová' },
      },
    ]);
    const applied = await call('POST', `${path}/changes`, own, {
      ...proposal,
      expectedVersion: preview.body.version,
      expectsApproval: preview.body.requiresApproval,
    });
    expect(applied.status).toBe(200);
    expect((await call('GET', path, own)).body).toMatchObject({
      answers: [{ questionId: school.id, optionId: school.options[0].id }],
      missingAnswers: [],
    });

    const organizer = await call(
      'GET',
      `organizations/${f.organizationId}/events/${f.event.id}/registrations/${registration.id}`,
      { user: f.ownerId },
    );
    expect(organizer.body.answers).toEqual([
      {
        questionId: school.id,
        question: 'Škola',
        isRequired: true,
        optionId: school.options[0].id,
        option: 'ZŠ Lipová',
      },
    ]);
  });
});

describe('a question as an accommodation attribute', () => {
  it('is offered with its answers and read as the answers of the hard attribute', async () => {
    const f = await setup();
    const [school] = (await f.save([SCHOOL])).body.questions;
    const rules = `organizations/${f.organizationId}/events/${f.event.id}/accommodation/hard-attribute`;

    const offered = await call('GET', rules, { user: f.ownerId });
    expect(offered.body.options[1]).toEqual({
      attribute: school.id,
      label: 'Škola',
      values: [
        { value: school.options[0].id, label: 'ZŠ Lipová' },
        { value: school.options[1].id, label: 'ZŠ Dubová' },
      ],
      defaultNonDeterminingValues: [],
      defaultNeutralValues: [],
    });
    const chosen = await call(
      'PUT',
      rules,
      { user: f.ownerId },
      {
        hardAttribute: school.id,
        nonDeterminingValues: [school.options[1].id],
      },
    );
    expect(chosen.body).toMatchObject({
      hardAttribute: school.id,
      nonDeterminingValues: [school.options[1].id],
    });
    // An answer that is not the question's is refused.
    expect(
      (
        await call(
          'PUT',
          rules,
          { user: f.ownerId },
          { hardAttribute: school.id, nonDeterminingValues: ['other'] },
        )
      ).status,
    ).toBe(400);

    const saved = await submit(f, {
      answers: [{ questionId: school.id, optionId: school.options[0].id }],
    });
    expect(
      await answers.answers(f.event.id, school.id, [saved.body.id]),
    ).toEqual(new Map([[saved.body.id, school.options[0].id]]));

    // A non-determining answer needs a determination, which then counts.
    const undecided = await submit(f, {
      answers: [{ questionId: school.id, optionId: school.options[1].id }],
    });
    const detail = `organizations/${f.organizationId}/events/${f.event.id}/registrations/${undecided.body.id}`;
    expect(
      (await call('GET', detail, { user: f.ownerId })).body
        .requiresManualAccommodation,
    ).toBe(true);
    await prisma.accommodationManualValue.create({
      data: {
        registrationId: undecided.body.id,
        eventId: f.event.id,
        attribute: school.id,
        value: school.options[0].id,
        basedOnAnswer: school.options[1].id,
        reason: 'domluva s rodiči',
        createdById: f.ownerId,
      },
    });
    expect(
      (await call('GET', detail, { user: f.ownerId })).body
        .requiresManualAccommodation,
    ).toBe(false);
  });
});
