import { CreateOrganizationDto } from '@/modules/organizations/dto/create-organization.dto';
import { OrganizationDto } from '@/modules/organizations/dto/organization.dto';
import { OrganizationsService } from '@/modules/organizations/services/organizations.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('organizations')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations')
@UseGuards(AuthenticatedUserGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Own organizations, sorted by name' })
  async list(@User() user: Identity): Promise<OrganizationDto[]> {
    return (await this.organizations.list(user.id)).map(OrganizationDto.from);
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'One of the own organizations' })
  async get(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationDto> {
    return OrganizationDto.from(
      await this.organizations.get(organizationId, user.id),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create an organization owned by the caller' })
  async create(
    @User() user: Identity,
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationDto> {
    return OrganizationDto.from(
      await this.organizations.create(dto.name, user.id),
    );
  }
}
