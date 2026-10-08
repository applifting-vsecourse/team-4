import { Identity } from '@/shared/auth/domain/identity';
import {
  createParamDecorator,
  ExecutionContext,
  NotImplementedException,
} from '@nestjs/common';

export const User = createParamDecorator(
  async (data: unknown, context: ExecutionContext): Promise<Identity> => {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      return request.session.user;
    }
    throw new NotImplementedException(
      `Cannot retrieve user from ${context.getType()} context`,
    );
  },
);
