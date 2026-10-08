import { PrismaService } from '@/core/prisma/prisma.service';
import { Quack } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, userId, createdAt } = params;

  return await prisma.quack.create({
    data: {
      text,
      createdAt,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}
