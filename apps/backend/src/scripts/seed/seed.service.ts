import { Injectable } from '@nestjs/common';
import { seedDatabase } from './seed/seed-database';

@Injectable()
export class SeedService {
  async run(): Promise<void> {
    await seedDatabase();
  }
}
