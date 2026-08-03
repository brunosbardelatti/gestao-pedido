import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isMarginEndDateOnOrAfterStartDate', async: false })
class EndDateOnOrAfterStartDateConstraint
  implements ValidatorConstraintInterface
{
  validate(endDate: unknown, arguments_: ValidationArguments): boolean {
    const input = arguments_.object as { startDate?: unknown };
    return (
      typeof input.startDate !== 'string' ||
      typeof endDate !== 'string' ||
      endDate >= input.startDate
    );
  }
}

export class GetMarginReportQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  @Validate(EndDateOnOrAfterStartDateConstraint, {
    message: 'endDate must be on or after startDate',
  })
  endDate!: string;

  @IsOptional()
  @IsUUID('4')
  productId?: string;
}
