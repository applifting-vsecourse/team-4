import { MAX_CHANGE_APPROVAL_DAYS } from '@/modules/events/domain/change-approval';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class ChangeApprovalInputDto {
  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    minimum: 0,
    maximum: MAX_CHANGE_APPROVAL_DAYS,
    example: 14,
    description:
      'Registration changes need approval from this many calendar days before the start of an affected term. Null or omitted removes the setting.',
  })
  @IsOptional()
  @IsInt({ message: 'Zadejte nezáporné celé číslo dní.' })
  @Min(0, { message: 'Zadejte nezáporné celé číslo dní.' })
  @Max(MAX_CHANGE_APPROVAL_DAYS, { message: 'Zadejte menší počet dní.' })
  days?: number | null;
}
