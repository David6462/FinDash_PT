import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { CommissionStrategy } from './commission-strategy.interface.js';

/** Tier CORPORATE: tarifa plana de 5, sin importar el monto. */
@Injectable()
export class CorporateCommissionStrategy implements CommissionStrategy {
  private static readonly FLAT_FEE = new Decimal('5');

  calculate(): Decimal {
    return CorporateCommissionStrategy.FLAT_FEE;
  }
}
