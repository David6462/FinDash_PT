import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AccountsController } from './accounts.controller.js';
import { AccountsService } from './accounts.service.js';
import { Account } from './entities/account.entity.js';

/**
 * Módulo de dominio de cuentas: GET /accounts (listado paginado, ADMIN) y
 * GET /accounts/me (cuentas del usuario autenticado).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Account]), AuthModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [TypeOrmModule, AccountsService],
})
export class AccountsModule {}
