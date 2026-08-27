import { Inject, Injectable, Optional } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { FRAUD_CHECK_DELAY_CONFIG } from './fraud-check.interface.js';
import type {
  FraudCheckDelayConfig,
  FraudChecker,
} from './fraud-check.interface.js';

/**
 * Antifraude simulado: espera una latencia aleatoria dentro del rango
 * configurado y aprueba siempre.
 *
 * El rango NO está hardcodeado: por defecto usa DEFAULT_DELAY, pero se puede
 * overridear proveyendo `FRAUD_CHECK_DELAY_CONFIG` (útil para acelerar los
 * tests). Para los tests que solo necesitan un resultado inmediato, lo más
 * limpio es sustituir todo el `FRAUD_CHECKER` por un doble.
 */
@Injectable()
export class FraudCheckService implements FraudChecker {
  static readonly DEFAULT_DELAY: FraudCheckDelayConfig = {
    minMs: 1000,
    maxMs: 10000,
  };

  private readonly delay: FraudCheckDelayConfig;

  constructor(
    @Optional()
    @Inject(FRAUD_CHECK_DELAY_CONFIG)
    delay?: FraudCheckDelayConfig,
  ) {
    this.delay = delay ?? FraudCheckService.DEFAULT_DELAY;
  }

  async check(_amount: Decimal): Promise<boolean> {
    const span = Math.max(0, this.delay.maxMs - this.delay.minMs);
    const ms = this.delay.minMs + Math.floor(Math.random() * (span + 1));
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
    return true;
  }
}
