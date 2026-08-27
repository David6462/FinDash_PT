import { AccountStatus, AccountTier } from './enums';
import { User } from './user.model';

/**
 * Espejo de `backend/src/modules/accounts/entities/account.entity.ts`.
 * `balance` viene como STRING (numeric(14,2) de Postgres), NO number.
 * `owner` solo llega poblado en el listado de ADMIN (GET /accounts).
 */
export interface Account {
  id: string;
  accountNumber: string;
  balance: string;
  tier: AccountTier;
  status: AccountStatus;
  owner?: User;
  createdAt: string;
}
