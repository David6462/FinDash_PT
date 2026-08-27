import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Decimal } from 'decimal.js';
import { Repository } from 'typeorm';
import { TransactionStatus } from '../../../common/enums/index.js';
import { toMoneyString } from '../../../common/money.js';
import { TransferDto } from '../dto/transfer.dto.js';
import { Transaction } from '../entities/transaction.entity.js';
import {
  isTransferDomainException,
  TransferDomainException,
} from '../exceptions/index.js';
import {
  createTransferContext,
  TransferContext,
} from './transfer-context.interface.js';
import { CalculateCommissionStep } from './steps/calculate-commission.step.js';
import { FraudCheckStep } from './steps/fraud-check.step.js';
import { GenerateAuthorizationCodeStep } from './steps/generate-authorization-code.step.js';
import { IdempotencyCheckStep } from './steps/idempotency-check.step.js';
import { LoadAndValidateAccountsStep } from './steps/load-and-validate-accounts.step.js';
import { PersistTransferStep } from './steps/persist-transfer.step.js';
import { ValidateFundsStep } from './steps/validate-funds.step.js';

export interface TransferInput {
  dto: TransferDto;
  idempotencyKey: string;
  requestingUserId: string;
}

/**
 * Orquesta los pasos de una transferencia EN SECUENCIA. No tiene lógica de
 * negocio propia: solo llama los pasos en orden y, si un paso lanza una
 * excepción de dominio, persiste la Transaction REJECTED y re-lanza (el
 * controller/Nest la traduce a la respuesta HTTP correcta).
 *
 * Orden: Idempotencia -> Cargar/validar cuentas -> Comisión -> Fondos ->
 *        Antifraude -> Código de autorización -> Persistir.
 */
@Injectable()
export class TransferOrchestratorUseCase {
  private readonly logger = new Logger(TransferOrchestratorUseCase.name);

  constructor(
    private readonly idempotencyCheckStep: IdempotencyCheckStep,
    private readonly loadAndValidateAccountsStep: LoadAndValidateAccountsStep,
    private readonly calculateCommissionStep: CalculateCommissionStep,
    private readonly validateFundsStep: ValidateFundsStep,
    private readonly fraudCheckStep: FraudCheckStep,
    private readonly generateAuthorizationCodeStep: GenerateAuthorizationCodeStep,
    private readonly persistTransferStep: PersistTransferStep,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
  ) {}

  async execute(input: TransferInput): Promise<Transaction> {
    const context = createTransferContext({
      dto: input.dto,
      idempotencyKey: input.idempotencyKey,
      requestingUserId: input.requestingUserId,
      amount: new Decimal(input.dto.amount),
    });

    await this.idempotencyCheckStep.execute(context);
    if (context.existingTransaction) {
      return context.existingTransaction;
    }

    try {
      await this.loadAndValidateAccountsStep.execute(context);
      await this.calculateCommissionStep.execute(context);
      await this.validateFundsStep.execute(context);
      await this.fraudCheckStep.execute(context);
      await this.generateAuthorizationCodeStep.execute(context);
      return await this.persistTransferStep.execute(context);
    } catch (error) {
      if (isTransferDomainException(error)) {
        await this.persistRejected(context, error);
      }
      throw error;
    }
  }

  /**
   * INSERT simple de la Transaction REJECTED. Sin lock: no se tocan saldos.
   *
   * Best-effort: si el INSERT falla (carrera con otra request de la misma
   * idempotencyKey, o cualquier otro problema), se loguea pero NUNCA se
   * propaga: la excepción de dominio original es la causa real que el cliente
   * necesita ver, no queremos enmascararla con un 500.
   */
  private async persistRejected(
    context: TransferContext,
    error: TransferDomainException,
  ): Promise<void> {
    const commission = context.commission ?? new Decimal(0);
    const totalDebited = context.totalDebited ?? context.amount;

    const rejected = this.transactions.create({
      sourceAccount: context.sourceAccount
        ? { id: context.sourceAccount.id }
        : null,
      destinationAccount: context.destinationAccount
        ? { id: context.destinationAccount.id }
        : null,
      amount: toMoneyString(context.amount),
      commissionCharged: toMoneyString(commission),
      totalDebited: toMoneyString(totalDebited),
      status: TransactionStatus.REJECTED,
      rejectionReason: error.rejectionReason,
      authorizationCode: null,
      idempotencyKey: context.idempotencyKey,
    });

    try {
      await this.transactions.save(rejected);
    } catch (saveError) {
      this.logger.warn(
        `No se pudo persistir la Transaction REJECTED para ${context.idempotencyKey}: ${String(saveError)}`,
      );
    }
  }
}
