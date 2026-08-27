import { Injectable } from '@nestjs/common';
import { AccountTier } from '../../../common/enums/index.js';
import { BasicCommissionStrategy } from './basic-commission.strategy.js';
import { CommissionStrategy } from './commission-strategy.interface.js';
import { CorporateCommissionStrategy } from './corporate-commission.strategy.js';
import { PremiumCommissionStrategy } from './premium-commission.strategy.js';

/**
 * Resuelve la CommissionStrategy que corresponde a un tier de cuenta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PUNTO CLAVE DE ARQUITECTURA — abierto a extensión, cerrado a modificación
 * ─────────────────────────────────────────────────────────────────────────────
 * Cuando el negocio pida un tier nuevo (p. ej. GOLD), los ÚNICOS cambios son:
 *
 *   1. Agregar el valor al enum `AccountTier`.
 *   2. Crear una clase nueva que implemente `CommissionStrategy`
 *      (p. ej. `GoldCommissionStrategy`).
 *   3. Inyectarla en este factory y registrarla en el Map de abajo,
 *      y declararla como provider en `TransactionsModule`.
 *
 * NADA cambia en el orquestador (`TransferOrchestratorUseCase`), en
 * `CalculateCommissionStep`, ni en ningún otro código existente: ellos solo
 * conocen la interfaz `CommissionStrategy`.
 */
@Injectable()
export class CommissionStrategyFactory {
  private readonly strategiesByTier: Map<AccountTier, CommissionStrategy>;

  constructor(
    basic: BasicCommissionStrategy,
    premium: PremiumCommissionStrategy,
    corporate: CorporateCommissionStrategy,
  ) {
    this.strategiesByTier = new Map<AccountTier, CommissionStrategy>([
      [AccountTier.BASIC, basic],
      [AccountTier.PREMIUM, premium],
      [AccountTier.CORPORATE, corporate],
    ]);
  }

  getStrategy(tier: AccountTier): CommissionStrategy {
    const strategy = this.strategiesByTier.get(tier);
    if (!strategy) {
      // No debería ocurrir nunca si el enum está cubierto. Es un bug de
      // configuración del factory, no un error de negocio -> Error interno.
      throw new Error(
        `No hay CommissionStrategy registrada para el tier "${tier}"`,
      );
    }
    return strategy;
  }
}
