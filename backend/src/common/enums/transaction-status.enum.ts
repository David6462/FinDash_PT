/**
 * Resultado final de una transacción. En esta etapa solo se modela la
 * estructura; la máquina de estados real se define con la orquestación.
 */
export enum TransactionStatus {
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}
