import {
  LINK_REQUESTED_MESSAGE,
  PARTICIPANT_SESSION_COOKIE,
  ParticipantIdentity,
} from '@/modules/participant-access/domain/participant-access';
import {
  MagicLinkRequestedDto,
  OpenSessionDto,
  ParticipantDto,
  RequestMagicLinkDto,
} from '@/modules/participant-access/dto/participant-access.dto';
import {
  CurrentParticipant,
  ParticipantSessionGuard,
} from '@/modules/participant-access/guards/participant-session.guard';
import { ParticipantAccessService } from '@/modules/participant-access/services/participant-access.service';
import { Config } from '@/shared/config/config.service';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

const sessionCookie = (request: Request): string | undefined =>
  (request.cookies as Record<string, string> | undefined)?.[
    PARTICIPANT_SESSION_COOKIE
  ];

@ApiTags('participant access')
@Controller('participant')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ParticipantAccessController {
  constructor(
    private readonly access: ParticipantAccessService,
    private readonly config: Config,
  ) {}

  @Post('magic-links')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Ask for a sign-in link',
    description:
      'No sign-in. The answer is the same for an e-mail with registrations, ' +
      'an unknown e-mail and an exhausted limit (3 links per account in 15 ' +
      'minutes); only a known e-mail within the limit is sent a link.',
  })
  @ApiResponse({ status: 200, type: MagicLinkRequestedDto })
  async requestLink(
    @Body() dto: RequestMagicLinkDto,
  ): Promise<MagicLinkRequestedDto> {
    await this.access.requestLink(dto.email);
    return { message: LINK_REQUESTED_MESSAGE };
  }

  @Post('session')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Exchange a link token for a 7-day session cookie',
    description:
      'A link works once and for 15 minutes. 401 `magic_link_invalid` for a ' +
      'used, unknown or expired one.',
  })
  async openSession(
    @Body() dto: OpenSessionDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const { token, expiresAt } = await this.access.openSession(dto.token);
    response.cookie(PARTICIPANT_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.nodeEnv === 'production',
      path: '/api',
      expires: expiresAt,
    });
  }

  @Get('me')
  @UseGuards(ParticipantSessionGuard)
  @ApiCookieAuth(PARTICIPANT_SESSION_COOKIE)
  @ApiOperation({ summary: 'The signed-in participant' })
  @ApiResponse({ status: 200, type: ParticipantDto })
  @ApiResponse({ status: 401, description: '`participant_session_required`' })
  me(@CurrentParticipant() participant: ParticipantIdentity): ParticipantDto {
    return { email: participant.email };
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'End the participant session' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.access.closeSession(sessionCookie(request));
    response.clearCookie(PARTICIPANT_SESSION_COOKIE, { path: '/api' });
  }
}
