import { Decimal } from 'decimal.js';
import { BasicCommissionStrategy } from './basic-commission.strategy.js';

describe('BasicCommissionStrategy', () => {
  const strategy = new BasicCommissionStrategy();

  it('cobra 2% de un monto normal', () => {
    expect(strategy.calculate(new Decimal('1000')).toFixed(2)).toBe('20.00');
  });

  it('cobra 2% de un monto con decimales sin error de redondeo (33.33)', () => {
    // 33.33 * 0.02 = 0.6666 -> 0.67
    expect(strategy.calculate(new Decimal('33.33')).toFixed(2)).toBe('0.67');
  });

  it('cobra 0 sobre un monto de 0', () => {
    expect(strategy.calculate(new Decimal(0)).toFixed(2)).toBe('0.00');
  });
});
