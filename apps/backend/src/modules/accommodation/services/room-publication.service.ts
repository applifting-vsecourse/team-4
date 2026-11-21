import {
  RoomPublicationRepository,
  TermPublication,
} from '@/modules/accommodation/repositories/room-publication.repository';
import { EventScope } from '@/modules/events/repositories/events.repository';
import { Injectable, NotFoundException } from '@nestjs/common';

const found = (publication: TermPublication | null): TermPublication => {
  if (!publication) throw new NotFoundException('Záznam není dostupný');
  return publication;
};

/** Publication of the room placements of a term (S4-02, #341). */
@Injectable()
export class RoomPublicationService {
  constructor(private readonly repository: RoomPublicationRepository) {}

  async get(scope: EventScope, termId: string): Promise<TermPublication> {
    return found(await this.repository.find(scope, termId));
  }

  async publish(scope: EventScope, termId: string): Promise<TermPublication> {
    return found(await this.repository.publish(scope, termId, scope.ownerId));
  }

  async unpublish(scope: EventScope, termId: string): Promise<TermPublication> {
    return found(await this.repository.unpublish(scope, termId));
  }
}
