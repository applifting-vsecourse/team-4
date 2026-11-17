import { MAX_STATEMENT_BYTES } from '@/modules/payments/domain/bank-statement';
import {
  BankTransactionsDto,
  StatementImportDto,
} from '@/modules/payments/dto/bank-transaction.dto';
import { BankTransactionsService } from '@/modules/payments/services/bank-transactions.service';
import { User } from '@/shared/auth/decorators/user.decorator';
import { Identity } from '@/shared/auth/domain/identity';
import { AuthenticatedUserGuard } from '@/shared/auth/guards/authenticated-user.guard';
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('payments')
@ApiCookieAuth('better-auth.session_token')
@Controller('organizations/:organizationId/events/:eventId/bank-transactions')
@UseGuards(AuthenticatedUserGuard)
export class BankTransactionsController {
  constructor(private readonly transactions: BankTransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Received transactions imported into the event, newest first',
    description: '404 for a foreign or missing event.',
  })
  async list(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<BankTransactionsDto> {
    return BankTransactionsDto.from(
      await this.transactions.list({
        organizationId,
        ownerId: user.id,
        eventId,
      }),
    );
  }

  @Post('import')
  @HttpCode(200)
  // One byte over the limit, so the service answers with its own message.
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_STATEMENT_BYTES + 1, files: 1 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary: 'Import a bank statement (CSV of account movements)',
    description:
      'Stores the incoming movements new to the event; outgoing ones and ' +
      'movements imported before are skipped and counted. 400 ' +
      '`statement_format` for a file that is not a supported statement, ' +
      '`statement_invalid` for an invalid movement (nothing is stored then), ' +
      '`statement_too_large` over 2 MB. 404 for a foreign or missing event.',
  })
  async import(
    @User() user: Identity,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<StatementImportDto> {
    if (!file) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'statement_format',
        message: 'Vyberte soubor s výpisem ve formátu CSV.',
      });
    }
    return StatementImportDto.from(
      await this.transactions.import(
        { organizationId, ownerId: user.id, eventId },
        new Uint8Array(file.buffer),
      ),
    );
  }
}
