import { AccountTier } from '../../../common/enums/index.js';
import { BasicCommissionStrategy } from './basic-commission.strategy.js';
import { CommissionStrategyFactory } from './commission-strategy.factory.js';
import { CorporateCommissionStrategy } from './corporate-commission.strategy.js';
import { PremiumCommissionStrategy } from './premium-commission.strategy.js';

describe('CommissionStrategyFactory', () => {
  const basic = new BasicCommissionStrategy();
  const premium = new PremiumCommissionStrategy();
  const corporate = new CorporateCommissionStrategy();
  const factory = new CommissionStrategyFactory(basic, premium, corporate);

  it('devuelve la estrategia BASIC para el tier BASIC', () => {
    expect(factory.getStrategy(AccountTier.BASIC)).toBe(basic);
  });

  it('devuelve la estrategia PREMIUM para el tier PREMIUM', () => {
    expect(factory.getStrategy(AccountTier.PREMIUM)).toBe(premium);
  });

  it('devuelve la estrategia CORPORATE para el tier CORPORATE', () => {
    expect(factory.getStrategy(AccountTier.CORPORATE)).toBe(corporate);
  });

  it('cubre todos los valores del enum AccountTier', () => {
    for (const tier of Object.values(AccountTier)) {
      expect(() => factory.getStrategy(tier)).not.toThrow();
    }
  });

  it('lanza error interno si el tier no tiene estrategia mapeada', () => {
    expect(() =>
      factory.getStrategy('GOLD' as AccountTier),
    ).toThrow('No hay CommissionStrategy registrada para el tier "GOLD"');
  });
});
