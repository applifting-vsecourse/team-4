import { LINK_REQUESTED_MESSAGE } from '@/modules/participant-access/domain/participant-access';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RequestMagicLinkDto {
  @ApiProperty({ example: 'jan@novak.cz', maxLength: 320 })
  @Transform(trim)
  @IsEmail({}, { message: 'Zadejte e-mail ve správném tvaru.' })
  @MaxLength(320)
  email!: string;
}

export class MagicLinkRequestedDto {
  @ApiProperty({ example: LINK_REQUESTED_MESSAGE })
  message!: string;
}

export class OpenSessionDto {
  @ApiProperty({ description: 'The token from the link in the e-mail.' })
  @IsString()
  @MaxLength(200)
  token!: string;
}

export class ParticipantDto {
  @ApiProperty({ example: 'jan@novak.cz' })
  email!: string;
}
