import { Decimal } from 'decimal.js';
import { PremiumCommissionStrategy } from './premium-commission.strategy.js';

describe('PremiumCommissionStrategy', () => {
  const strategy = new PremiumCommissionStrategy();

  it.each(['1000', '33.33', '0'])('nunca cobra comisión (monto %s)', (amount) => {
    expect(strategy.calculate(new Decimal(amount)).toFixed(2)).toBe('0.00');
  });
});
