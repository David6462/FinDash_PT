import { AccountNotFoundException } from './account-not-found.exception.js';
import { FraudCheckTimeoutException } from './fraud-check-timeout.exception.js';
import { InactiveAccountException } from './inactive-account.exception.js';
import { InsufficientFundsException } from './insufficient-funds.exception.js';
import { SelfTransferException } from './self-transfer.exception.js';

export * from './rejection-reason.enum.js';
export * from './account-not-found.exception.js';
export * from './fraud-check-timeout.exception.js';
export * from './inactive-account.exception.js';
export * from './insufficient-funds.exception.js';
export * from './self-transfer.exception.js';

/**
 * Excepciones de dominio del motor de transferencias. Todas extienden una
 * HttpException de Nest (Nest las traduce sola a la respuesta HTTP) y todas
 * llevan un `rejectionReason` que el orquestador persiste en la Transaction
 * REJECTED.
 */
export type TransferDomainException =
  | InsufficientFundsException
  | FraudCheckTimeoutException
  | AccountNotFoundException
  | SelfTransferException
  | InactiveAccountException;

export function isTransferDomainException(
  error: unknown,
): error is TransferDomainException {
  return (
    error instanceof InsufficientFundsException ||
    error instanceof FraudCheckTimeoutException ||
    error instanceof AccountNotFoundException ||
    error instanceof SelfTransferException ||
    error instanceof InactiveAccountException
  );
}
