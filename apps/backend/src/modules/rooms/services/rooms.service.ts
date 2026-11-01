import { EventScope } from '@/modules/events/repositories/events.repository';
import {
  findCapacityShortfalls,
  RoomInput,
  RoomsOverviewModel,
} from '@/modules/rooms/domain/room';
import {
  isUniqueViolation,
  LockedRooms,
  RoomsRepository,
} from '@/modules/rooms/repositories/rooms.repository';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// Error bodies carry a `code` (and the form `field` where one fits) next to
// the Czech `message`, so the form can put the error at the right input.
const notAvailable = (): NotFoundException =>
  new NotFoundException('Záznam není dostupný');

const labelTaken = (): ConflictException =>
  new ConflictException({
    statusCode: 409,
    code: 'room_label_taken',
    field: 'label',
    message: 'Pokoj s tímto označením už v akci existuje.',
  });

@Injectable()
export class RoomsService {
  constructor(private readonly repository: RoomsRepository) {}

  /** A foreign event looks the same as a missing one (S2-03). */
  async get(scope: EventScope): Promise<RoomsOverviewModel> {
    const overview = await this.repository.findOverview(scope);
    if (!overview) throw notAvailable();
    return overview;
  }

  async add(scope: EventScope, input: RoomInput): Promise<RoomsOverviewModel> {
    await this.write(
      scope,
      input.terms.map((term) => term.termId),
      async (rooms) => {
        await rooms.insertRoom(input);
        return true;
      },
    );
    return this.get(scope);
  }

  async update(
    scope: EventScope,
    roomId: string,
    input: RoomInput,
  ): Promise<RoomsOverviewModel> {
    await this.write(
      scope,
      input.terms.map((term) => term.termId),
      (rooms) => rooms.updateRoom(roomId, input),
    );
    return this.get(scope);
  }

  async remove(scope: EventScope, roomId: string): Promise<RoomsOverviewModel> {
    await this.write(scope, [], (rooms) => rooms.deleteRoom(roomId));
    return this.get(scope);
  }

  /**
   * Applies `change` under the term locks and compares the capacity of every
   * term before and after. Throwing rolls the whole change back, so a change
   * touching several terms is saved completely or not at all. Nothing here
   * depends on the event being open or locked: rooms stay editable (S2-05).
   */
  private async write(
    scope: EventScope,
    termIds: string[],
    change: (rooms: LockedRooms) => Promise<boolean>,
  ): Promise<void> {
    let outcome;
    try {
      outcome = await this.repository.withLockedRooms(scope, async (rooms) => {
        const before = await rooms.termCapacities();
        const known = new Set(before.map((term) => term.id));
        if (termIds.some((termId) => !known.has(termId))) {
          throw new BadRequestException({
            statusCode: 400,
            code: 'term_unknown',
            field: 'terms',
            message: 'Dostupnost lze vybrat jen z termínů této akce.',
          });
        }
        if (!(await change(rooms))) throw notAvailable();
        const shortfalls = findCapacityShortfalls(
          before,
          await rooms.termCapacities(),
        );
        if (shortfalls.length > 0) {
          throw new ConflictException({
            statusCode: 409,
            code: 'capacity_below_confirmed',
            conflicts: shortfalls.map((term) => ({
              termId: term.id,
              termLabel: term.label,
              proposedCapacity: term.capacity,
              confirmedParticipants: term.confirmed,
            })),
            message:
              'Kapacita nesmí klesnout pod počet potvrzených účastníků: ' +
              shortfalls
                .map(
                  (term) =>
                    `${term.label} (nová kapacita ${term.capacity}, potvrzeno ${term.confirmed})`,
                )
                .join('; '),
          });
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw labelTaken();
      throw error;
    }
    if (!outcome.found) throw notAvailable();
  }
}
