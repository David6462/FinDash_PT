import { TransactionStatus } from './enums';
import { Account } from './account.model';

/**
 * Espejo de `backend/src/modules/transactions/entities/transaction.entity.ts`.
 * `amount`, `commissionCharged` y `totalDebited` vienen como STRING
 * (numeric(14,2) de Postgres), NO number.
 * `sourceAccount` / `destinationAccount` pueden ser null en una REJECTED.
 */
export interface Transaction {
  id: string;
  sourceAccount: Account | null;
  destinationAccount: Account | null;
  amount: string;
  commissionCharged: string;
  totalDebited: string;
  status: TransactionStatus;
  rejectionReason: string | null;
  idempotencyKey: string;
  authorizationCode: string | null;
  createdAt: string;
}
