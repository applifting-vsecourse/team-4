import {
  DynamicModule,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
  Provider,
} from '@nestjs/common';
import { EmailService } from './interfaces/email-service.interface';

@Module({})
export class EmailModule {
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => Promise<EmailService> | EmailService;
    inject: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    const emailProvider: Provider = {
      provide: 'EmailService',
      useFactory: options.useFactory,
      inject: options.inject,
    };

    return {
      module: EmailModule,
      providers: [emailProvider],
      exports: [emailProvider],
    };
  }
}
