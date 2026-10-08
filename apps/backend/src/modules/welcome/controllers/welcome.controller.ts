import { Config } from '@/shared/config/config.service';
import { Controller, Get, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { WelcomeDto } from './dto/welcome.dto';

@Controller()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class WelcomeController {
  constructor(private readonly config: Config) {}

  @Get('/')
  @ApiOperation({
    summary: 'Welcome message',
    description:
      'Welcome message including name, description, version and useful links',
  })
  async getWelcomeMessage(): Promise<WelcomeDto> {
    return {
      message: `Welcome to ${this.config.name}`,
      name: this.config.name,
      description: this.config.description,
      version: this.config.version,
      healthCheck: '/api/health',
      restApi: '/api',
      swaggerDocs: '/api/docs',
      authEndpointsDocs: '/api/auth/reference',
    };
  }

  @Get('/health')
  @ApiOperation({ summary: 'Health check' })
  async getHealth(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
}
