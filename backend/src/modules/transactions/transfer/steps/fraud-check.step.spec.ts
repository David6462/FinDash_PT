import { jest } from '@jest/globals';
import { Decimal } from 'decimal.js';
import { FraudCheckTimeoutException } from '../../exceptions/index.js';
import { FraudCheckStep } from './fraud-check.step.js';
import type { TransferContext } from '../transfer-context.interface.js';

const config = { getOrThrow: () => '3000' } as never;

function context(): TransferContext {
  return { amount: new Decimal(100) } as unknown as TransferContext;
}

describe('FraudCheckStep', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('aprueba si el antifraude responde antes del timeout', async () => {
    const fraudChecker = { check: jest.fn().mockResolvedValue(true) };
    const step = new FraudCheckStep(fraudChecker as never, config);
    const ctx = context();

    await step.execute(ctx);

    expect(fraudChecker.check).toHaveBeenCalledWith(ctx.amount);
    expect(ctx.fraudApproved).toBe(true);
  });

  it('lanza FraudCheckTimeoutException si el antifraude tarda más que FRAUD_CHECK_TIMEOUT_MS', async () => {
    jest.useFakeTimers();
    // check() que nunca resuelve -> gana la carrera el timeout
    const fraudChecker = {
      check: jest.fn().mockReturnValue(new Promise<boolean>(() => {})),
    };
    const step = new FraudCheckStep(fraudChecker as never, config);

    const execution = step.execute(context());
    const assertion = expect(execution).rejects.toBeInstanceOf(
      FraudCheckTimeoutException,
    );

    await jest.advanceTimersByTimeAsync(3000);
    await assertion;
  });
});
