import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  Matches,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEndDateOnOrAfterStartDate', async: false })
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

  defaultMessage(): string {
    return 'endDate must be on or after startDate';
  }
}

export class GetSalesReportQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  startDate!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true, strictSeparator: true })
  @Validate(EndDateOnOrAfterStartDateConstraint)
  endDate!: string;

  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined) return false;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  includeCanceled = false;
}
