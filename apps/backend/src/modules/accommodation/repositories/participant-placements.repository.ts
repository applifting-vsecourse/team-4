import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ParticipantTermPlacement,
  participantWishState,
} from '@/modules/accommodation/domain/participant-placements';
import {
  byName,
  fullName,
} from '@/modules/accommodation/domain/room-placement';
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

    // A placement in a room the term no longer offers is no valid room: the
    // organizer sees it flagged, the participant sees none (#316).
    const available = new Set(
      (
        await this.prisma.roomTermAvailability.findMany({
          where: {
            termId: { in: registration.terms.map(({ term }) => term.id) },
            isAvailable: true,
          },
          select: { termId: true, roomId: true },
        })
      ).map(({ termId, roomId }) => `${termId}:${roomId}`),
    );
    const validRoom = (
      termId: string,
      roomId: string | undefined,
    ): string | null =>
      roomId !== undefined && available.has(`${termId}:${roomId}`)
        ? roomId
        : null;

    return registration.terms
      .map(({ term, placement }): ParticipantTermPlacement => {
        const base = {
          termId: term.id,
          label: term.label,
          startDate: term.startDate,
          endDate: term.endDate,
        };
        if (!term.roomPublication) return { ...base, isPublished: false };
        const ownRoomId = validRoom(term.id, placement?.room.id);
        const wishes = registration.roommateWishes.flatMap(({ to }) => {
          const theirs = to.terms.find((t) => t.termId === term.id);
          if (!theirs) return [];
          return [
            {
              registrationId: to.id,
              name: fullName(to),
              state: participantWishState(
                ownRoomId,
                validRoom(term.id, theirs.placement?.roomId),
              ),
            },
          ];
        });
        return {
          ...base,
          isPublished: true,
          room: placement && ownRoomId ? { label: placement.room.label } : null,
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
