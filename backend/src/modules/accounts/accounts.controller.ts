import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccountRole } from '../../common/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginatedResult } from '../../common/dto/paginated-result.js';
import type { AuthUser } from '../auth/strategies/jwt.strategy.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { AccountsService } from './accounts.service.js';
import { ListAccountsQueryDto } from './dto/list-accounts-query.dto.js';
import { Account } from './entities/account.entity.js';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /** Listado paginado de cuentas. Solo ADMIN. */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.ADMIN)
  list(
    @Query() query: ListAccountsQueryDto,
  ): Promise<PaginatedResult<Account>> {
    return this.accountsService.listAccounts(query);
  }

  /** Cuentas del usuario autenticado. Cualquier rol autenticado. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyAccounts(@CurrentUser() user: AuthUser): Promise<Account[]> {
    return this.accountsService.findByOwner(user.userId);
  }
}
