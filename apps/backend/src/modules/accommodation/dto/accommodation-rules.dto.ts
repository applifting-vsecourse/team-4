import { HARD_ATTRIBUTE_OPTIONS } from '@/modules/accommodation/domain/determination';
import {
  HardAttributeSetting,
  PreferencesSetting,
} from '@/modules/accommodation/services/accommodation-rules.service';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const ATTRIBUTES = HARD_ATTRIBUTE_OPTIONS.map((option) => option.attribute);

export class HardAttributeOptionDto {
  @ApiProperty({ example: 'gender' })
  attribute!: string;

  @ApiProperty({ type: [String], description: 'Every answer of the question.' })
  values!: string[];

  @ApiProperty({
    type: [String],
    description:
      'Answers that leave the room to the organizer when this attribute is ' +
      'chosen; a missing answer never determines a room either.',
  })
  nonDeterminingValues!: string[];
}

export class HardAttributeSettingDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'gender',
    description:
      'The categorical question that splits rooms; null when none does and ' +
      'only the beds of the rooms count.',
  })
  hardAttribute!: string | null;

  @ApiProperty({
    type: [HardAttributeOptionDto],
    description: 'The questions the organizer can choose from.',
  })
  options!: HardAttributeOptionDto[];

  static from(setting: HardAttributeSetting): HardAttributeSettingDto {
    return {
      hardAttribute: setting.hardAttribute,
      options: setting.options.map((option) => ({
        attribute: option.attribute,
        values: [...option.values],
        nonDeterminingValues: [...option.nonDeterminingValues],
      })),
    };
  }
}

export class SaveHardAttributeDto {
  @ApiProperty({
    type: String,
    nullable: true,
    enum: ATTRIBUTES,
    description: 'One of the options, or null for none.',
  })
  @IsIn([...ATTRIBUTES, null], {
    message: 'Vyberte tvrdý atribut z nabídky, nebo žádný.',
  })
  hardAttribute!: string | null;
}

export class SoftPreferenceItemDto {
  @ApiProperty({
    example: 'gender',
    description:
      '`roommate-wishes` for "Přání", otherwise a categorical question.',
  })
  @IsString()
  @MaxLength(64)
  id!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['other', 'undisclosed'],
    description:
      'Answers of a soft attribute that never count; a missing answer is ' +
      'always neutral. Absent for "Přání".',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  neutralValues?: string[];
}

export class SoftAttributeOptionDto {
  @ApiProperty({ example: 'gender' })
  attribute!: string;

  @ApiProperty({ type: [String], description: 'Every answer of the question.' })
  values!: string[];

  @ApiProperty({
    type: [String],
    description: 'The neutral answers offered when the attribute is added.',
  })
  defaultNeutralValues!: string[];
}

export class RoomProposalPreferencesDto {
  @ApiProperty({
    type: [SoftPreferenceItemDto],
    description:
      'Ranked, most important first; each item outranks every one below ' +
      'it. Empty when the proposal skips the soft preferences.',
  })
  preferences!: SoftPreferenceItemDto[];

  @ApiProperty({
    example: 'roommate-wishes',
    description: 'The id of "Přání".',
  })
  wishes!: string;

  @ApiProperty({
    type: [SoftAttributeOptionDto],
    description:
      'The categorical questions that can be soft attributes; never the ' +
      'hard attribute of the event.',
  })
  attributes!: SoftAttributeOptionDto[];

  static from(setting: PreferencesSetting): RoomProposalPreferencesDto {
    return {
      preferences: setting.preferences.map((item) =>
        'neutralValues' in item
          ? { id: item.id, neutralValues: [...item.neutralValues] }
          : { id: item.id },
      ),
      wishes: setting.wishes,
      attributes: setting.attributes.map((option) => ({
        attribute: option.attribute,
        values: [...option.values],
        defaultNeutralValues: [...option.defaultNeutralValues],
      })),
    };
  }
}

export class SaveRoomProposalPreferencesDto {
  @ApiProperty({
    type: [SoftPreferenceItemDto],
    description: 'The ranked list, most important first; may be empty.',
  })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SoftPreferenceItemDto)
  preferences!: SoftPreferenceItemDto[];
}
