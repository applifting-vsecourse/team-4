import { PrismaService } from '@/core/prisma/prisma.service';
import { User, UserRole } from '@/generated/prisma/client';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';

type CreateUserParams = {
  email: string;
  password: string;
  name: string;
  username: string;
  role?: string;
};

export async function createUser(
  prisma: PrismaService,
  auth: BetterAuth,
  params: CreateUserParams,
): Promise<User> {
  const { email, password, name, username, role } = params;

  // use better auth api to sign the user up using email & password
  await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
    },
  });

  // find the user in the database
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    throw new Error(`Failed to create user with email: ${email}`);
  }

  // assign a role to the user directly
  await prisma.user.update({
    where: { id: user.id },
    data: {
      username,
      role: role as UserRole,
    },
  });

  return user;
}
