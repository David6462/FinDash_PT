import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { CommissionStrategy } from './commission-strategy.interface.js';

/** Tier PREMIUM: sin comisión. */
@Injectable()
export class PremiumCommissionStrategy implements CommissionStrategy {
  calculate(): Decimal {
    return new Decimal(0);
  }
}
