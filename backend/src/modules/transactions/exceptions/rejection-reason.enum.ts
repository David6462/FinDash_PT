/**
 * Texto que queda guardado en `Transaction.rejectionReason` cuando una
 * transferencia termina en REJECTED.
 */
export enum RejectionReason {
  INSUFFICIENT_FUNDS = 'Fondos insuficientes',
  FRAUD_CHECK_TIMEOUT = 'Timeout del chequeo antifraude',
  ACCOUNT_NOT_FOUND = 'Cuenta no encontrada',
  SELF_TRANSFER = 'Transferencia a la misma cuenta',
  INACTIVE_ACCOUNT = 'Cuenta inactiva',
}
