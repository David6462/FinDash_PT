import { Decimal } from 'decimal.js';

/**
 * Regla de comisión de una transferencia. Cada tier de cuenta tiene su propia
 * implementación (Strategy pattern) y el CommissionStrategyFactory las mapea.
 */
export interface CommissionStrategy {
  /** Comisión a cobrar dado el monto que el cliente pidió transferir. */
  calculate(amount: Decimal): Decimal;
}
