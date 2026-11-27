import {
  MealCategory,
  MealDay,
  MealNote,
  MealOverviewModel,
} from '@/modules/meals/domain/meal-overview';
import { ApiProperty } from '@nestjs/swagger';

const DIETS = ['vegetarian', 'vegan', 'gluten_free', 'lactose_free'] as const;

export class MealCategoryDto {
  @ApiProperty({
    enum: DIETS,
    isArray: true,
    description: 'The diets of the category; empty is the basic meal.',
  })
  diets!: (typeof DIETS)[number][];

  @ApiProperty({ description: 'Participants eating this category that day.' })
  count!: number;

  static from(model: MealCategory): MealCategoryDto {
    return { diets: [...model.diets], count: model.count };
  }
}

export class MealDayDto {
  @ApiProperty({ format: 'date' })
  date!: string;

  @ApiProperty({
    description: 'Confirmed participants; the sum of categories.',
  })
  total!: number;

  @ApiProperty({ type: [MealCategoryDto] })
  categories!: MealCategoryDto[];

  static from(model: MealDay): MealDayDto {
    return {
      date: model.date,
      total: model.total,
      categories: model.categories.map(MealCategoryDto.from),
    };
  }
}

export class MealNoteDto {
  @ApiProperty({ format: 'uuid' })
  registrationId!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({ description: 'The participant’s own words, not a diet.' })
  note!: string;

  static from(model: MealNote): MealNoteDto {
    return { ...model };
  }
}

export class MealOverviewDto {
  @ApiProperty({ format: 'uuid' })
  termId!: string;

  @ApiProperty()
  termLabel!: string;

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiProperty({ description: 'Confirmed participants of the term.' })
  participants!: number;

  @ApiProperty({
    type: [MealDayDto],
    description: 'Every day of the term, both ends included.',
  })
  days!: MealDayDto[];

  @ApiProperty({
    type: [MealNoteDto],
    description: 'Free-text notes on food with the participant.',
  })
  notes!: MealNoteDto[];

  static from(model: MealOverviewModel): MealOverviewDto {
    return {
      termId: model.term.id,
      termLabel: model.term.label,
      startDate: model.term.startDate,
      endDate: model.term.endDate,
      participants: model.participants,
      days: model.days.map(MealDayDto.from),
      notes: model.notes.map(MealNoteDto.from),
    };
  }
}
