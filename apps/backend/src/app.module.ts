import { ConfigModule } from '@applifting-io/nestjs-decorated-config';
import { Module } from '@nestjs/common';
import { AccommodationModule } from './modules/accommodation/accommodation.module';
import { EventsModule } from './modules/events/events.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ParticipantAccessModule } from './modules/participant-access/participant-access.module';
import { ParticipantNotificationsModule } from './modules/participant-notifications/participant-notifications.module';
import { ParticipantProfileModule } from './modules/participant-profile/participant-profile.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProgrammeModule } from './modules/programme/programme.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { WelcomeModule } from './modules/welcome/welcome.module';
import { AuthModule } from './shared/auth/auth.module';
import { Config } from './shared/config/config.service';

const imports = [
  ConfigModule.forRootAsync(Config, { validate: true }),
  AuthModule,
  EventsModule,
  RoomsModule,
  AccommodationModule,
  ProgrammeModule,
  RegistrationsModule,
  PaymentsModule,
  ParticipantAccessModule,
  ParticipantProfileModule,
  ParticipantNotificationsModule,
  OrganizationsModule,
  WelcomeModule,
];

@Module({
  imports,
})
export class AppModule {}
