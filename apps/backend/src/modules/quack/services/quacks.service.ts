import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QuacksService {
  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(): Promise<Quack[]> {
    return this.quackRepository.getQuacks();
  }

  async createQuack(
    user: Identity,
    quackData: { text: string },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
