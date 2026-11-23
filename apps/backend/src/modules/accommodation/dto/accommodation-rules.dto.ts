import { EventAttribute } from '@/modules/accommodation/domain/attributes';
import {
  HardAttributeSetting,
  PreferencesSetting,
} from '@/modules/accommodation/services/accommodation-rules.service';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class AttributeValueDto {
  @ApiProperty({
    example: 'female',
    description: 'Gender’s code, or the option id of a question.',
  })
  value!: string;

  @ApiProperty({ example: 'Žena' })
  label!: string;
}

/** A categorical question of the event: gender or one of its own (#485). */
export class EventAttributeDto {
  @ApiProperty({
    example: 'gender',
    description: '`gender`, or the id of a question of the event.',
  })
  attribute!: string;

  @ApiProperty({ example: 'Pohlaví' })
  label!: string;

  @ApiProperty({
    type: [AttributeValueDto],
    description: 'Every answer, in the order of the form.',
  })
  values!: AttributeValueDto[];

  @ApiProperty({
    type: [String],
    description:
      'Answers that decide no room when it is chosen as the hard attribute ' +
      'without choosing them: “Jiná odpověď” and “Nechci uvést” for ' +
      'gender, none for a question.',
  })
  defaultNonDeterminingValues!: string[];

  @ApiProperty({
    type: [String],
    description:
      'The neutral answers offered when it is added as a soft attribute.',
  })
  defaultNeutralValues!: string[];

  static from(attribute: EventAttribute): EventAttributeDto {
    return {
      attribute: attribute.attribute,
      label: attribute.label,
      values: attribute.values.map((value) => ({ ...value })),
      defaultNonDeterminingValues: [...attribute.defaultNonDetermining],
      defaultNeutralValues: [...attribute.defaultNeutral],
    };
  }
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
    type: [String],
    description:
      'Its answers that decide no room; a missing answer never decides one ' +
      'either. Empty without a hard attribute.',
  })
  nonDeterminingValues!: string[];

  @ApiProperty({
    type: [EventAttributeDto],
    description:
      'Every categorical question of the event, gender first, to choose ' +
      'from and to word answers with.',
  })
  options!: EventAttributeDto[];

  static from(setting: HardAttributeSetting): HardAttributeSettingDto {
    return {
      hardAttribute: setting.hardAttribute,
      nonDeterminingValues: [...setting.nonDeterminingValues],
      options: setting.attributes.map(EventAttributeDto.from),
    };
  }
}

export class SaveHardAttributeDto {
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'gender',
    description: 'One of the options, or null for none.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsString({ message: 'Vyberte tvrdý atribut z nabídky, nebo žádný.' })
  @MaxLength(64, { message: 'Vyberte tvrdý atribut z nabídky, nebo žádný.' })
  hardAttribute!: string | null;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Its answers that decide no room; left out, the option’s defaults.',
  })
  @IsOptional()
  @IsArray({ message: 'Vyberte odpovědi z nabídky.' })
  @ArrayMaxSize(10, { message: 'Vyberte odpovědi z nabídky.' })
  @IsString({ each: true, message: 'Vyberte odpovědi z nabídky.' })
  @MaxLength(100, { each: true, message: 'Vyberte odpovědi z nabídky.' })
  nonDeterminingValues?: string[];
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
    type: [EventAttributeDto],
    description:
      'The categorical questions that can be soft attributes; never the ' +
      'hard attribute of the event.',
  })
  attributes!: EventAttributeDto[];

  static from(setting: PreferencesSetting): RoomProposalPreferencesDto {
    return {
      preferences: setting.preferences.map((item) =>
        'neutralValues' in item
          ? { id: item.id, neutralValues: [...item.neutralValues] }
          : { id: item.id },
      ),
      wishes: setting.wishes,
      attributes: setting.attributes.map(EventAttributeDto.from),
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
