import { TermPublication } from '@/modules/accommodation/repositories/room-publication.repository';
import { ApiProperty } from '@nestjs/swagger';

export class RoomPublicationDto {
  @ApiProperty({
    description: 'Whether the participants of the term see their rooms.',
  })
  isPublished!: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When it was published; null while it is not.',
  })
  publishedAt!: string | null;

  static from(publication: TermPublication): RoomPublicationDto {
    return {
      isPublished: publication.publishedAt !== null,
      publishedAt: publication.publishedAt?.toISOString() ?? null,
    };
  }
}
