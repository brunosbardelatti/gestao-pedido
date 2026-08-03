import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isExpirationToDateOnOrAfterFromDate', async: false })
class ToDateOnOrAfterFromDateConstraint
  implements ValidatorConstraintInterface
{
  validate(toDate: unknown, arguments_: ValidationArguments): boolean {
    const input = arguments_.object as { fromDate?: unknown };
    return (
      typeof input.fromDate !== 'string' ||
      typeof toDate !== 'string' ||
      toDate >= input.fromDate
    );
  }
}

export class GetExpirationReportQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  fromDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  @Validate(ToDateOnOrAfterFromDateConstraint, {
    message: 'toDate must be on or after fromDate',
  })
  toDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  withinDays = 7;
}
