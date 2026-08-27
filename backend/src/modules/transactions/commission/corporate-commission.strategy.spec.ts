import { Decimal } from 'decimal.js';
import { CorporateCommissionStrategy } from './corporate-commission.strategy.js';

describe('CorporateCommissionStrategy', () => {
  const strategy = new CorporateCommissionStrategy();

  it.each(['1000', '33.33', '0'])(
    'cobra siempre una tarifa plana de 5 (monto %s)',
    (amount) => {
      expect(strategy.calculate(new Decimal(amount)).toFixed(2)).toBe('5.00');
    },
  );
});
