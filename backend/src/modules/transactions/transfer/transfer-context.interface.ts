import { Decimal } from 'decimal.js';
import { Account } from '../../accounts/entities/account.entity.js';
import { Transaction } from '../entities/transaction.entity.js';
import { TransferDto } from '../dto/transfer.dto.js';

/**
 * Estado que fluye entre los pasos del orquestador. Los campos de entrada los
 * llena el orquestador; el resto los van poblando los pasos en orden.
 */
export interface TransferContext {
  // ─── entrada ───
  readonly dto: TransferDto;
  readonly idempotencyKey: string;
  readonly requestingUserId: string;
  /** dto.amount ya convertido a Decimal. */
  readonly amount: Decimal;

  // ─── IdempotencyCheckStep ───
  /** Si ya existía una Transaction con esta idempotencyKey, se corta acá. */
  existingTransaction?: Transaction;

  // ─── LoadAndValidateAccountsStep ───
  sourceAccount?: Account;
  destinationAccount?: Account;

  // ─── CalculateCommissionStep ───
  commission?: Decimal;
  /** amount + commission: lo que se descuenta de la cuenta origen. */
  totalDebited?: Decimal;

  // ─── FraudCheckStep ───
  fraudApproved?: boolean;

  // ─── GenerateAuthorizationCodeStep ───
  authorizationCode?: string;
}

export function createTransferContext(input: {
  dto: TransferDto;
  idempotencyKey: string;
  requestingUserId: string;
  amount: Decimal;
}): TransferContext {
  return {
    dto: input.dto,
    idempotencyKey: input.idempotencyKey,
    requestingUserId: input.requestingUserId,
    amount: input.amount,
  };
}
