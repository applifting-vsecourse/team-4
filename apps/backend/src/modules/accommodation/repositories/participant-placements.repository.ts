import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ParticipantTermPlacement,
  participantWishState,
} from '@/modules/accommodation/domain/participant-placements';
import { byName, fullName } from '@/modules/registrations/domain/roommate-wish';
import { Injectable } from '@nestjs/common';

/**
 * The own room placements of a participant (S4-02, #341): for each confirmed
 * term of the own registration, the room and the state of the own wishes
 * once the organizer published the term. Nothing else of other people is
 * read out than the names the participant wished for.
 */
@Injectable()
export class ParticipantPlacementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Null when the registration is not the account's own. */
  async find(
    accountId: string,
    registrationId: string,
  ): Promise<ParticipantTermPlacement[] | null> {
    const registration = await this.prisma.registration.findFirst({
      where: { id: registrationId, participantAccountId: accountId },
      select: {
        terms: {
          where: { status: 'confirmed' },
          select: {
            term: {
              select: {
                id: true,
                label: true,
                startDate: true,
                endDate: true,
                roomPublication: { select: { termId: true } },
              },
            },
            placement: {
              select: { room: { select: { label: true, id: true } } },
            },
          },
        },
        roommateWishes: {
          select: {
            to: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                terms: {
                  where: { status: 'confirmed' },
                  select: {
                    termId: true,
                    placement: { select: { roomId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!registration) return null;

    return registration.terms
      .map(({ term, placement }): ParticipantTermPlacement => {
        const base = {
          termId: term.id,
          label: term.label,
          startDate: term.startDate,
          endDate: term.endDate,
        };
        if (!term.roomPublication) return { ...base, published: false };
        const ownRoomId = placement?.room.id ?? null;
        const wishes = registration.roommateWishes.flatMap(({ to }) => {
          const theirs = to.terms.find((t) => t.termId === term.id);
          if (!theirs) return [];
          return [
            {
              registrationId: to.id,
              name: fullName(to),
              state: participantWishState(
                ownRoomId,
                theirs.placement?.roomId ?? null,
              ),
            },
          ];
        });
        return {
          ...base,
          published: true,
          room: placement ? { label: placement.room.label } : null,
          wishes: wishes.sort(byName),
        };
      })
      .sort(
        (a, b) =>
          a.startDate.getTime() - b.startDate.getTime() ||
          a.label.localeCompare(b.label, 'cs'),
      );
  }
}
