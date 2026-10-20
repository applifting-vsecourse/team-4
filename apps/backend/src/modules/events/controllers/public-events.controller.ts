import { PublicEventDto } from '@/modules/events/dto/event.dto';
import { EventsService } from '@/modules/events/services/events.service';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// What the link generates: 12 base64url characters. Anything else cannot match
// an event, so it gets the same 404 without a lookup.
const PUBLIC_ID = /^[A-Za-z0-9_-]{1,32}$/;

@ApiTags('public events')
@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly events: EventsService) {}

  @Get(':publicId')
  @ApiOperation({
    summary: 'An event with open registration, by its public link',
    description:
      'No sign-in. 404 for a draft and for an unknown link alike, with no ' +
      'event data. Never returns registrations, capacity, payment settings or ' +
      'the organization.',
  })
  async get(@Param('publicId') publicId: string): Promise<PublicEventDto> {
    if (!PUBLIC_ID.test(publicId)) {
      throw new NotFoundException('Záznam není dostupný');
    }
    return PublicEventDto.from(await this.events.getPublic(publicId));
  }
}
