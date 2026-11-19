import { HARD_ATTRIBUTE_OPTIONS } from '@/modules/accommodation/domain/determination';
import { HardAttributeSetting } from '@/modules/accommodation/services/accommodation-rules.service';
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

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
