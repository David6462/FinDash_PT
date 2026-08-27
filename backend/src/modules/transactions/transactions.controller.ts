import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountRole } from '../../common/enums/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginatedResult } from '../../common/dto/paginated-result.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import type { AuthUser } from '../auth/strategies/jwt.strategy.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { IdempotencyKey } from './decorators/idempotency-key.decorator.js';
import { TransferDto } from './dto/transfer.dto.js';
import { Transaction } from './entities/transaction.entity.js';
import { TransactionsService } from './transactions.service.js';
import { TransferOrchestratorUseCase } from './transfer/transfer-orchestrator.use-case.js';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transferOrchestrator: TransferOrchestratorUseCase,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Ejecuta una transferencia. Solo CLIENT (los ADMIN no transfieren).
   * Requiere el header `X-Idempotency-Key` (obligatorio).
   */
  @Post('transfer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AccountRole.CLIENT)
  transfer(
    @CurrentUser() user: AuthUser,
    @IdempotencyKey() idempotencyKey: string,
    @Body() dto: TransferDto,
  ): Promise<Transaction> {
    return this.transferOrchestrator.execute({
      dto,
      idempotencyKey,
      requestingUserId: user.userId,
    });
  }

  /**
   * Historial de movimientos del usuario autenticado (origen o destino).
   * Cualquier rol autenticado: cada quien ve lo suyo.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyMovements(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<Transaction>> {
    return this.transactionsService.findMyMovements(user.userId, query);
  }
}
