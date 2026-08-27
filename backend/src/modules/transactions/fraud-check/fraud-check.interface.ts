import { Decimal } from 'decimal.js';

/**
 * Chequeo antifraude. Interfaz + token de inyección para poder sustituir la
 * implementación real (con latencia de 1-10s) por un doble rápido en los tests
 * (`.overrideProvider(FRAUD_CHECKER).useValue(...)` en el TestingModule).
 */
export interface FraudChecker {
  /** Resuelve `true` si la operación queda aprobada. */
  check(amount: Decimal): Promise<boolean>;
}

export const FRAUD_CHECKER = Symbol('FRAUD_CHECKER');

/** Rango de latencia simulada. Configurable vía FRAUD_CHECK_DELAY_CONFIG. */
export interface FraudCheckDelayConfig {
  minMs: number;
  maxMs: number;
}

export const FRAUD_CHECK_DELAY_CONFIG = Symbol('FRAUD_CHECK_DELAY_CONFIG');
