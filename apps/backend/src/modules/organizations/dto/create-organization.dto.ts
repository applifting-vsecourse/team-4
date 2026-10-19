import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ maxLength: 200, example: 'Skautský oddíl Sokol' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Název organizace je povinný.' })
  @MaxLength(200, { message: 'Název organizace může mít nejvýše 200 znaků.' })
  name!: string;
}
