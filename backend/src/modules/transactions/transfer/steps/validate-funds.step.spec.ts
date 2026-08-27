import { Decimal } from 'decimal.js';
import { InsufficientFundsException } from '../../exceptions/index.js';
import { ValidateFundsStep } from './validate-funds.step.js';
import type { TransferContext } from '../transfer-context.interface.js';

function context(balance: string, totalDebited: string): TransferContext {
  return {
    sourceAccount: { balance },
    totalDebited: new Decimal(totalDebited),
  } as unknown as TransferContext;
}

describe('ValidateFundsStep', () => {
  const step = new ValidateFundsStep();

  it('pasa si el saldo cubre exactamente el totalDebited', () => {
    expect(() => step.execute(context('102.00', '102.00'))).not.toThrow();
  });

  it('pasa si el saldo es mayor que el totalDebited', () => {
    expect(() => step.execute(context('1000.00', '102.00'))).not.toThrow();
  });

  it('lanza InsufficientFundsException si el saldo no alcanza (aunque sea por 1 centavo)', () => {
    expect(() => step.execute(context('101.99', '102.00'))).toThrow(
      InsufficientFundsException,
    );
  });
});
