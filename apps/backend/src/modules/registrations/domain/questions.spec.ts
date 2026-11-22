import {
  answersView,
  invalidAnswers,
  missingRequired,
  planQuestions,
  Question,
  questionsVersion,
  QuestionUsage,
} from '@/modules/registrations/domain/questions';

const school: Question = {
  id: 'q1',
  label: 'Škola',
  isRequired: true,
  options: [
    { id: 'o1', label: 'Lipová' },
    { id: 'o2', label: 'Dubová' },
  ],
};
const troop: Question = {
  id: 'q2',
  label: 'Oddíl',
  isRequired: false,
  options: [
    { id: 'o3', label: 'Lišky' },
    { id: 'o4', label: 'Vlci' },
  ],
};
const unused: QuestionUsage = {
  answeredQuestionIds: new Set(),
  chosenOptionIds: new Set(),
  usedBy: new Map(),
};
const draft = (question: Question) => ({
  id: question.id,
  label: question.label,
  isRequired: question.isRequired,
  options: question.options.map((o) => ({ id: o.id, label: o.label })),
});

describe('answers to the questions of a form (#485)', () => {
  it('needs every required answer, from the question’s own options', () => {
    expect(invalidAnswers([school, troop], [])).toBe('answer_required');
    expect(
      invalidAnswers([school, troop], [{ questionId: 'q1', optionId: 'o2' }]),
    ).toBeNull();
    expect(
      invalidAnswers([school], [{ questionId: 'q1', optionId: 'o3' }]),
    ).toBe('questions_changed');
    expect(
      invalidAnswers(
        [school],
        [
          { questionId: 'q1', optionId: 'o1' },
          { questionId: 'q1', optionId: 'o2' },
        ],
      ),
    ).toBe('answer_invalid');
    expect(missingRequired([school, troop], []).map((q) => q.id)).toEqual([
      'q1',
    ]);
  });

  it('refuses a form that showed other questions, a rename too', () => {
    const shown = questionsVersion([school, troop]);
    const answers = [{ questionId: 'q1', optionId: 'o1' }];
    expect(invalidAnswers([school, troop], answers, shown)).toBeNull();
    const renamed = {
      ...troop,
      options: [troop.options[0]!, { id: 'o4', label: 'Medvědi' }],
    };
    expect(invalidAnswers([school, renamed], answers, shown)).toBe(
      'questions_changed',
    );
    expect(
      invalidAnswers([school, troop, { ...troop, id: 'q3' }], answers, shown),
    ).toBe('questions_changed');
    // Without a version, only the answers count.
    expect(invalidAnswers([school, renamed], answers)).toBeNull();
  });

  it('shows every question with the answer given or none', () => {
    expect(
      answersView([school, troop], [{ questionId: 'q2', optionId: 'o4' }]),
    ).toEqual([
      {
        questionId: 'q1',
        question: 'Škola',
        isRequired: true,
        optionId: null,
        option: null,
      },
      {
        questionId: 'q2',
        question: 'Oddíl',
        isRequired: false,
        optionId: 'o4',
        option: 'Vlci',
      },
    ]);
  });
});

describe('the organizer’s list of questions (#485)', () => {
  it('renames and adds, keeping ids, and removes what nobody uses', () => {
    const plan = planQuestions(
      [school, troop],
      [
        {
          ...draft(school),
          label: ' Kterou školu? ',
          options: [{ id: 'o1', label: 'Lipová ' }, { label: 'Jiná' }],
        },
      ],
      unused,
    );
    expect(plan).toEqual({
      removedQuestionIds: ['q2'],
      removedOptionIds: ['o2'],
      questions: [
        {
          id: 'q1',
          label: 'Kterou školu?',
          isRequired: true,
          options: [{ id: 'o1', label: 'Lipová' }, { label: 'Jiná' }],
        },
      ],
    });
  });

  it('keeps an answered question, a chosen option and a question in use', () => {
    const answered: QuestionUsage = {
      ...unused,
      answeredQuestionIds: new Set(['q2']),
      chosenOptionIds: new Set(['o2']),
    };
    expect(
      planQuestions([school, troop], [draft(school)], answered),
    ).toMatchObject({ code: 'question_answered' });
    expect(
      planQuestions(
        [school],
        [
          {
            ...draft(school),
            options: [{ id: 'o1', label: 'Lipová' }, { label: 'Jiná' }],
          },
        ],
        answered,
      ),
    ).toMatchObject({ code: 'option_chosen' });
    const inUse: QuestionUsage = {
      ...unused,
      usedBy: new Map([['q2', 'soft']]),
    };
    expect(
      planQuestions([school, troop], [draft(school)], inUse),
    ).toMatchObject({
      code: 'question_in_use',
    });
    expect(
      planQuestions(
        [troop],
        [
          {
            ...draft(troop),
            options: [{ id: 'o3', label: 'Lišky' }, { label: 'Sovy' }],
          },
        ],
        inUse,
      ),
    ).toMatchObject({ code: 'question_in_use' });
  });

  it('refuses ids that are not the event’s and limits the list', () => {
    expect(
      planQuestions([school], [{ ...draft(school), id: 'other' }], unused),
    ).toMatchObject({ code: 'questions_changed' });
    expect(
      planQuestions(
        [],
        Array.from({ length: 6 }, () => ({ ...draft(school), id: undefined })),
        unused,
      ),
    ).toMatchObject({ code: 'questions_invalid' });
  });
});
