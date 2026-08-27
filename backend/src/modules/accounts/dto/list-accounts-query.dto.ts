import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus } from '../../../common/enums/index.js';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class ListAccountsQueryDto extends PaginationQueryDto {
  /** Filtro por documento del owner. Coincidencia parcial (ILIKE). */
  @IsOptional()
  @IsString()
  documentNumber?: string;

  /** Filtro por estado exacto de la cuenta. */
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
