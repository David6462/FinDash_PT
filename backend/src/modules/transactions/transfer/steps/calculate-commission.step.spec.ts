import { jest } from '@jest/globals';
import { Decimal } from 'decimal.js';
import { AccountTier } from '../../../../common/enums/index.js';
import { CalculateCommissionStep } from './calculate-commission.step.js';
import type { TransferContext } from '../transfer-context.interface.js';

describe('CalculateCommissionStep', () => {
  it('usa el factory según el tier de la cuenta origen y guarda commission + totalDebited', () => {
    const strategy = { calculate: jest.fn().mockReturnValue(new Decimal('2.00')) };
    const factory = { getStrategy: jest.fn().mockReturnValue(strategy) };
    const step = new CalculateCommissionStep(factory as never);

    const context = {
      amount: new Decimal('100'),
      sourceAccount: { tier: AccountTier.BASIC },
    } as unknown as TransferContext;

    step.execute(context);

    expect(factory.getStrategy).toHaveBeenCalledWith(AccountTier.BASIC);
    expect(strategy.calculate).toHaveBeenCalledWith(context.amount);
    expect(context.commission!.toFixed(2)).toBe('2.00');
    expect(context.totalDebited!.toFixed(2)).toBe('102.00');
  });

  it('totalDebited = amount cuando la comisión es 0 (sin errores con decimales)', () => {
    const strategy = { calculate: () => new Decimal(0) };
    const factory = { getStrategy: () => strategy };
    const step = new CalculateCommissionStep(factory as never);

    const context = {
      amount: new Decimal('33.33'),
      sourceAccount: { tier: AccountTier.PREMIUM },
    } as unknown as TransferContext;

    step.execute(context);

    expect(context.commission!.toFixed(2)).toBe('0.00');
    expect(context.totalDebited!.toFixed(2)).toBe('33.33');
  });
});
