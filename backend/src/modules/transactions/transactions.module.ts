import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '../accounts/entities/account.entity.js';
import { AuthModule } from '../auth/auth.module.js';
import { BasicCommissionStrategy } from './commission/basic-commission.strategy.js';
import { CommissionStrategyFactory } from './commission/commission-strategy.factory.js';
import { CorporateCommissionStrategy } from './commission/corporate-commission.strategy.js';
import { PremiumCommissionStrategy } from './commission/premium-commission.strategy.js';
import { Transaction } from './entities/transaction.entity.js';
import { FRAUD_CHECKER } from './fraud-check/fraud-check.interface.js';
import { FraudCheckService } from './fraud-check/fraud-check.service.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
import { CalculateCommissionStep } from './transfer/steps/calculate-commission.step.js';
import { FraudCheckStep } from './transfer/steps/fraud-check.step.js';
import { GenerateAuthorizationCodeStep } from './transfer/steps/generate-authorization-code.step.js';
import { IdempotencyCheckStep } from './transfer/steps/idempotency-check.step.js';
import { LoadAndValidateAccountsStep } from './transfer/steps/load-and-validate-accounts.step.js';
import { PersistTransferStep } from './transfer/steps/persist-transfer.step.js';
import { ValidateFundsStep } from './transfer/steps/validate-funds.step.js';
import { TransferOrchestratorUseCase } from './transfer/transfer-orchestrator.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, Account]), AuthModule],
  controllers: [TransactionsController],
  providers: [
    // Comisiones (Strategy pattern).
    BasicCommissionStrategy,
    PremiumCommissionStrategy,
    CorporateCommissionStrategy,
    CommissionStrategyFactory,

    // Antifraude: la impl real detrás del token; en tests se hace override.
    // El rango de latencia sale del .env (FRAUD_CHECK_MIN/MAX_DELAY_MS) y, si no
    // está, del DEFAULT_DELAY (1000-10000). Nunca hardcodeado sin override.
    {
      provide: FRAUD_CHECKER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new FraudCheckService({
          minMs: Number(
            config.get<string>('FRAUD_CHECK_MIN_DELAY_MS') ??
              FraudCheckService.DEFAULT_DELAY.minMs,
          ),
          maxMs: Number(
            config.get<string>('FRAUD_CHECK_MAX_DELAY_MS') ??
              FraudCheckService.DEFAULT_DELAY.maxMs,
          ),
        }),
    },

    // Pasos del orquestador.
    IdempotencyCheckStep,
    LoadAndValidateAccountsStep,
    CalculateCommissionStep,
    ValidateFundsStep,
    FraudCheckStep,
    GenerateAuthorizationCodeStep,
    PersistTransferStep,

    TransferOrchestratorUseCase,
    TransactionsService,
  ],
  exports: [TypeOrmModule],
})
export class TransactionsModule {}
