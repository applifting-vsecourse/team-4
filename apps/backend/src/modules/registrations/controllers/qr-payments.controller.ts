import {
  QrPaymentInputDto,
  QrPaymentPageDto,
  QrPaymentResultDto,
} from '@/modules/registrations/dto/qr-payment.dto';
import { QrPaymentsService } from '@/modules/registrations/services/qr-payments.service';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

// Public: the unguessable token in the path is the only credential (F21-1).
@ApiTags('qr payments')
@Controller('public/payments/:token')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class QrPaymentsController {
  constructor(private readonly payments: QrPaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'What the QR payment page shows',
    description:
      'Event name and remaining debt only. Opening it records nothing. ' +
      '404 `payment_unavailable` for an unknown token, without personal data.',
  })
  @ApiResponse({ status: 200, type: QrPaymentPageDto })
  async getPage(@Param('token') token: string): Promise<QrPaymentPageDto> {
    return this.payments.getPage(token);
  }

  @Post()
  @ApiOperation({
    summary: 'Pay all or part of the remaining debt',
    description:
      'Records one payment of this registration. The same key and amount ' +
      'return the saved payment (200) without a second record. 409 ' +
      '`nothing_to_pay` or `debt_reduced` (with the current `balanceMinor`) ' +
      'when the amount no longer fits the debt, 409 `submission_key_reused` ' +
      'for a key sent before with another amount.',
  })
  @ApiResponse({ status: 201, type: QrPaymentResultDto })
  @ApiResponse({ status: 200, type: QrPaymentResultDto })
  async pay(
    @Param('token') token: string,
    @Body() dto: QrPaymentInputDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<QrPaymentResultDto> {
    const result = await this.payments.pay(
      token,
      dto.submissionKey,
      dto.amountMinor,
    );
    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);
    return { paidMinor: result.paidMinor, balanceMinor: result.balanceMinor };
  }
}
