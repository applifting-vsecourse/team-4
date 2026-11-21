import { PlacementRefusal } from '@/modules/accommodation/domain/room-placement';
import {
  PlaceInput,
  PlacementOutcome,
  RoomPlacementsRepository,
  TermPlacements,
} from '@/modules/accommodation/repositories/room-placements.repository';
import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

const conflict = (code: string, message: string): ConflictException =>
  new ConflictException({ statusCode: 409, code, message });

const REFUSALS: Record<PlacementRefusal, () => Error> = {
  not_confirmed: () =>
    conflict(
      'participant_not_confirmed',
      'Do pokoje lze umístit jen potvrzeného účastníka termínu.',
    ),
  room_unavailable: () =>
    conflict('room_unavailable', 'Pokoj v tomto termínu není k dispozici.'),
  placement_locked: () =>
    conflict(
      'placement_locked',
      'Umístění je uzamčené. Před přesunem nebo odebráním ho odemkněte.',
    ),
  not_placed: () => conflict('not_placed', 'Účastník nemá přidělený pokoj.'),
};

/** Manual placement into rooms of a term (F14-2, #337). */
@Injectable()
export class RoomPlacementsService {
  constructor(private readonly repository: RoomPlacementsRepository) {}

  async get(scope: EventScope, termId: string): Promise<TermPlacements> {
    const placements = await this.repository.find(scope, termId);
    if (!placements) throw notAvailable();
    return placements;
  }

  async place(
    scope: EventScope,
    termId: string,
    registrationId: string,
    input: PlaceInput,
  ): Promise<TermPlacements> {
    return this.saved(
      await this.repository.place(
        scope,
        termId,
        registrationId,
        input,
        scope.ownerId,
      ),
    );
  }

  async remove(
    scope: EventScope,
    termId: string,
    registrationId: string,
  ): Promise<TermPlacements> {
    return this.saved(
      await this.repository.remove(scope, termId, registrationId),
    );
  }

  async lock(
    scope: EventScope,
    termId: string,
    registrationId: string,
    isLocked: boolean,
  ): Promise<TermPlacements> {
    return this.saved(
      await this.repository.lock(scope, termId, registrationId, isLocked),
    );
  }

  private saved(outcome: PlacementOutcome): TermPlacements {
    switch (outcome.kind) {
      case 'saved':
        return outcome.placements;
      case 'not_found':
        throw notAvailable();
      case 'refused':
        throw REFUSALS[outcome.refusal]();
      case 'needs_confirmation':
        throw new ConflictException({
          statusCode: 409,
          code: 'placement_warnings',
          message:
            'Umístění porušuje pravidla pokoje. Uložte ho jen jako potvrzenou výjimku.',
          warnings: outcome.warnings,
        });
    }
  }
}
