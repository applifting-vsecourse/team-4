import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { EventsModule } from './modules/events/events.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { AuthModule } from './shared/auth/auth.module';
import { Config } from './shared/config/config.service';

const imports = [
  ConfigModule.forRootAsync(Config, { validate: true }),
  AuthModule,
  EventsModule,
  RoomsModule,
  OrganizationsModule,
  WelcomeModule,
];

@Module({
  imports,
})
export class AppModule {}
