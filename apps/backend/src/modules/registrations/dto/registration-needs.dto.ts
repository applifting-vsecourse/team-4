import {
  DIET_CHOICES,
  DIET_NOTE_MAX,
  DietChoice,
  HEALTH_MAX,
  RegistrationNeeds,
  TRANSPORT_CHOICES,
  TRANSPORT_NOTE_MAX,
  TransportChoice,
} from '@/modules/registrations/domain/registration-needs';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Not shared with registration-input.dto, which imports this file.
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export const DIET_EXCLUSIVE_MESSAGE =
  '„Bez omezení“ nejde vybrat spolu s jinou volbou stravy.';

/** "Bez omezení" and a predefined diet choice cannot be stored together. */
@ValidatorConstraint({ name: 'dietExclusive' })
class DietExclusive implements ValidatorConstraintInterface {
  validate(diet: unknown, args: ValidationArguments): boolean {
    const needs = args.object as Partial<RegistrationNeeds>;
    return !(
      needs.hasNoDietRestriction === true &&
      Array.isArray(diet) &&
      diet.length > 0
    );
  }

  defaultMessage(): string {
    return DIET_EXCLUSIVE_MESSAGE;
  }
}

/** Transport, diet and health (F63); every part optional, "" is not provided. */
export class RegistrationNeedsDto implements RegistrationNeeds {
  @ApiProperty({ enum: TRANSPORT_CHOICES, nullable: true, type: String })
  @ValidateIf((_: object, value: unknown) => value !== null)
  @IsIn(TRANSPORT_CHOICES, { message: 'Neplatná volba dopravy.' })
  transport!: TransportChoice | null;

  @ApiProperty({ maxLength: TRANSPORT_NOTE_MAX })
  @Transform(trim)
  @IsString()
  @MaxLength(TRANSPORT_NOTE_MAX, {
    message: `Poznámka k dopravě může mít nejvýše ${TRANSPORT_NOTE_MAX} znaků.`,
  })
  transportNote!: string;

  @ApiProperty({
    description: 'Explicit "Bez omezení"; false with any `diet` choice.',
  })
  @IsBoolean()
  hasNoDietRestriction!: boolean;

  @ApiProperty({
    enum: DIET_CHOICES,
    isArray: true,
    description:
      'Combinable. Together with `hasNoDietRestriction` gives 400 ' +
      '(`field`: `diet`).',
  })
  @IsArray()
  @ArrayUnique({ message: 'Volba stravy je vybraná víckrát.' })
  @IsIn(DIET_CHOICES, { each: true, message: 'Neplatná volba stravy.' })
  @Validate(DietExclusive)
  diet!: DietChoice[];

  @ApiProperty({ maxLength: DIET_NOTE_MAX })
  @Transform(trim)
  @IsString()
  @MaxLength(DIET_NOTE_MAX, {
    message: `Vlastní text ke stravě může mít nejvýše ${DIET_NOTE_MAX} znaků.`,
  })
  dietNote!: string;

  @ApiProperty({ maxLength: HEALTH_MAX })
  @Transform(trim)
  @IsString()
  @MaxLength(HEALTH_MAX, {
    message: `Zdravotní omezení mohou mít nejvýše ${HEALTH_MAX} znaků.`,
  })
  health!: string;

  static from(needs: RegistrationNeeds): RegistrationNeedsDto {
    return { ...needs, diet: [...needs.diet] };
  }
}

/** The organizer's correction (F63): the needs on the version they saw. */
export class CorrectNeedsDto {
  @ApiProperty({
    description:
      'The registration `version` the organizer saw; a newer one gives 409 ' +
      '`registration_stale`.',
  })
  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @ApiProperty({ type: RegistrationNeedsDto })
  @ValidateNested()
  @Type(() => RegistrationNeedsDto)
  needs!: RegistrationNeedsDto;
}
