import { ApiProperty } from '@nestjs/swagger';

/** The organizer who made a determination or a move. */
export class ActorDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;
}
