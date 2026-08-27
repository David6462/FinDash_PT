/** Espejo de `backend/src/modules/dashboard/dto/dashboard-kpis.dto.ts`. */
export interface DashboardKpis {
  /** Suma de `amount` de todas las transacciones COMPLETED. String decimal. */
  totalVolumeTransacted: string;
  /** Cantidad de transacciones REJECTED. */
  failedTransactionsCount: number;
}

export interface VolumeByTier {
  tier: string;
  totalVolume: string;
  transactionCount: number;
}
