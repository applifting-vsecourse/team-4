import { Module } from '@nestjs/common';
import { WelcomeController } from './controllers/welcome.controller';

@Module({
  controllers: [WelcomeController],
})
export class WelcomeModule {}
