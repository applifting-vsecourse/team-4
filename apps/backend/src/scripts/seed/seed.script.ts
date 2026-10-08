import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { SeedService } from './seed.service';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function main() {
  const app = await NestFactory.createApplicationContext(SeedModule);
  const seedService = app.get(SeedService);
  try {
    await seedService.run();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

void main();
