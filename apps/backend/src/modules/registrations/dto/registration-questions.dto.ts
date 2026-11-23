import {
  Answer,
  AnswerView,
  MAX_OPTIONS,
  MAX_QUESTIONS,
  OPTION_LABEL_MAX,
  Question,
  QUESTION_LABEL_MAX,
} from '@/modules/registrations/domain/questions';
import { ManagedQuestion } from '@/modules/registrations/repositories/registration-questions.repository';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

// ─── Nastavení → Otázky v přihlášce ─────────────────────────────────────────

export class ManagedOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ description: 'Someone chose it: it cannot be removed.' })
  isChosen!: boolean;
}

export class ManagedQuestionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  isRequired!: boolean;

  @ApiProperty({ description: 'Someone answered it: it cannot be removed.' })
  isAnswered!: boolean;

  @ApiProperty({
    enum: ['hard', 'soft'],
    nullable: true,
    description:
      'How the accommodation rules use it: as the hard attribute or a soft ' +
      'preference. Then it keeps every option. Null when unused.',
  })
  usedBy!: 'hard' | 'soft' | null;

  @ApiProperty({ type: [ManagedOptionDto], description: 'In form order.' })
  options!: ManagedOptionDto[];

  static from(question: ManagedQuestion): ManagedQuestionDto {
    return {
      id: question.id,
      label: question.label,
      isRequired: question.isRequired,
      isAnswered: question.isAnswered,
      usedBy: question.usedBy,
      options: question.options.map((option) => ({ ...option })),
    };
  }
}

export class EventQuestionsDto {
  @ApiProperty({ type: [ManagedQuestionDto], description: 'In form order.' })
  questions!: ManagedQuestionDto[];

  static from(questions: ManagedQuestion[]): EventQuestionsDto {
    return { questions: questions.map(ManagedQuestionDto.from) };
  }
}

export class OptionDraftDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'An existing option of the question; left out for a new one.',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Načtěte otázky znovu.' })
  id?: string;

  @ApiProperty({ maxLength: OPTION_LABEL_MAX })
  @IsString({ message: 'Vyplňte možnost odpovědi.' })
  @MaxLength(OPTION_LABEL_MAX, {
    message: `Možnost má nejvýš ${OPTION_LABEL_MAX} znaků.`,
  })
  label!: string;
}

export class QuestionDraftDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'An existing question of the event; left out for a new one.',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Načtěte otázky znovu.' })
  id?: string;

  @ApiProperty({ maxLength: QUESTION_LABEL_MAX })
  @IsString({ message: 'Vyplňte text otázky.' })
  @MaxLength(QUESTION_LABEL_MAX, {
    message: `Otázka má nejvýš ${QUESTION_LABEL_MAX} znaků.`,
  })
  label!: string;

  @ApiProperty()
  @IsBoolean({ message: 'Zvolte, zda je odpověď povinná.' })
  isRequired!: boolean;

  @ApiProperty({ type: [OptionDraftDto], description: '2–10, in form order.' })
  @IsArray()
  @ArrayMaxSize(MAX_OPTIONS, {
    message: `Otázka má nejvýš ${MAX_OPTIONS} možností.`,
  })
  @ValidateNested({ each: true })
  @Type(() => OptionDraftDto)
  options!: OptionDraftDto[];
}

export class SaveEventQuestionsDto {
  @ApiProperty({
    type: [QuestionDraftDto],
    description:
      'The whole list in form order. Left out: removed (409 when answered ' +
      'or used by the accommodation rules).',
  })
  @IsArray()
  @ArrayMaxSize(MAX_QUESTIONS, {
    message: `Akce může mít nejvýš ${MAX_QUESTIONS} vlastních otázek.`,
  })
  @ValidateNested({ each: true })
  @Type(() => QuestionDraftDto)
  questions!: QuestionDraftDto[];
}

// ─── The form and the answers ──────────────────────────────────────────────

export class FormOptionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;
}

/** A question as the registration form asks it. */
export class FormQuestionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  isRequired!: boolean;

  @ApiProperty({ type: [FormOptionDto], description: 'In form order.' })
  options!: FormOptionDto[];

  static from(question: Question): FormQuestionDto {
    return {
      id: question.id,
      label: question.label,
      isRequired: question.isRequired,
      options: question.options.map((option) => ({ ...option })),
    };
  }
}

export class AnswerInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('all', { message: 'Otázky přihlášky se mezitím změnily.' })
  questionId!: string;

  @ApiProperty({ format: 'uuid', description: 'One option of the question.' })
  @IsUUID('all', { message: 'Otázky přihlášky se mezitím změnily.' })
  optionId!: string;
}

/** Validation of an `answers` list, shared by the form and a change. */
export function answersOf(input?: AnswerInputDto[]): Answer[] {
  return (input ?? []).map((answer) => ({
    questionId: answer.questionId,
    optionId: answer.optionId,
  }));
}

export class AnswerViewDto {
  @ApiProperty({ format: 'uuid' })
  questionId!: string;

  @ApiProperty()
  question!: string;

  @ApiProperty()
  isRequired!: boolean;

  @ApiProperty({ format: 'uuid', type: String, nullable: true })
  optionId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The chosen option; null when not answered.',
  })
  option!: string | null;

  static from(view: AnswerView): AnswerViewDto {
    return { ...view };
  }
}
