import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Creating and editing an event use the same fields (S2-04). */
export class EventInputDto {
  @ApiProperty({ maxLength: 200, example: 'Lesní dobrodružství 2027' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vyplňte název akce.' })
  @MaxLength(200, { message: 'Název akce může mít nejvýše 200 znaků.' })
  name!: string;

  @ApiProperty({ maxLength: 5000 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vyplňte popis.' })
  @MaxLength(5000, { message: 'Popis může mít nejvýše 5000 znaků.' })
  description!: string;

  @ApiProperty({ maxLength: 300, example: 'Podlesí' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Vyplňte místo.' })
  @MaxLength(300, { message: 'Místo může mít nejvýše 300 znaků.' })
  location!: string;
}
