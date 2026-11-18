import { PrismaService } from '@/core/prisma/prisma.service';
import {
  ParticipantProfile,
  ParticipantProfileValues,
} from '@/modules/participant-profile/domain/participant-profile';
import { Injectable } from '@nestjs/common';

const PROFILE = {
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
} as const;

type ProfileRow = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
};

const toModel = ({ email, ...values }: ProfileRow): ParticipantProfile =>
  new ParticipantProfile(email, values);

@Injectable()
export class ParticipantProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** The account comes from a verified session, so it exists. */
  async find(accountId: string): Promise<ParticipantProfile> {
    return toModel(
      await this.prisma.participantAccount.findUniqueOrThrow({
        where: { id: accountId },
        select: PROFILE,
      }),
    );
  }

  /** Writes only the profile columns; the e-mail stays as it is. */
  async save(
    accountId: string,
    values: ParticipantProfileValues,
  ): Promise<ParticipantProfile> {
    return toModel(
      await this.prisma.participantAccount.update({
        where: { id: accountId },
        data: values,
        select: PROFILE,
      }),
    );
  }
}
