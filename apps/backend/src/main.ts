import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';
import { BetterAuth } from './shared/auth/providers/better-auth.provider';
import { Config } from './shared/config/config.service';

/**
 * Main application entry point
 * Initializes and configures the NestJS application
 */
async function main(): Promise<void> {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  // Get configuration service
  const config = app.get(Config);

  // Configure CORS - Allows cross-origin requests from specific origins
  app.enableCors({
    origin: [config.backendUrl, config.frontendUrl],
    credentials: true,
  });

  // Setup cookie parser middleware
  app.use(cookieParser());

  const appInstance = app.getHttpAdapter().getInstance();
  const betterAuth = app.get<BetterAuth>('BetterAuth');
  // Express 5 (via NestJS 11) requires named wildcards — a bare `*` throws.
  appInstance.all('/api/auth/*splat', toNodeHandler(betterAuth));
  appInstance.use(express.json());

  // Configure API prefix for all routes
  app.setGlobalPrefix('api');

  // Setup Swagger API documentation at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.name)
    .setDescription(config.description)
    .setVersion(config.version)
    .addServer('/api')
    .addCookieAuth('better-auth.session_token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Print debug information for development purposes
  if (config.nodeEnv !== 'production') {
    console.log('App configuration:', {
      nodeEnv: config.nodeEnv,
      port: config.port,
      backendUrl: config.backendUrl,
      frontendUrl: config.frontendUrl,
    });
  }

  // Start the application
  await app.listen(config.port);
  console.log(`Application is running on: ${config.backendUrl}`);
}

// Execute the main function
main().catch((error) => console.error('Application error:', error));
