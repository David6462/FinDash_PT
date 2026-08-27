export interface DashboardKpisDto {
  /** Suma de `amount` de todas las transacciones COMPLETED. String decimal. */
  totalVolumeTransacted: string;
  /** Cantidad de transacciones REJECTED. */
  failedTransactionsCount: number;
}

export interface VolumeByTierItemDto {
  tier: string;
  totalVolume: string;
  transactionCount: number;
}
