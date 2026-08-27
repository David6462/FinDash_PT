import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { CommissionStrategy } from './commission-strategy.interface.js';

/** Tier BASIC: 2% del monto. */
@Injectable()
export class BasicCommissionStrategy implements CommissionStrategy {
  private static readonly RATE = new Decimal('0.02');

  calculate(amount: Decimal): Decimal {
    return amount.mul(BasicCommissionStrategy.RATE);
  }
}
