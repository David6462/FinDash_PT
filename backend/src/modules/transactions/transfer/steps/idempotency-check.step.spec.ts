import { jest } from '@jest/globals';
import { Decimal } from 'decimal.js';
import { IdempotencyCheckStep } from './idempotency-check.step.js';
import type { TransferContext } from '../transfer-context.interface.js';

function baseContext(): TransferContext {
  return {
    dto: { destinationAccountNumber: 'AC-2', amount: 100 },
    idempotencyKey: 'key-1',
    requestingUserId: 'user-1',
    amount: new Decimal(100),
  };
}

describe('IdempotencyCheckStep', () => {
  it('deja la Transaction previa en el contexto si ya existe una con esa key', async () => {
    const existing = { id: 'tx-1' };
    const transactions = { findOne: jest.fn().mockResolvedValue(existing) };
    const step = new IdempotencyCheckStep(transactions as never);
    const context = baseContext();

    await step.execute(context);

    expect(transactions.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idempotencyKey: 'key-1' } }),
    );
    expect(context.existingTransaction).toBe(existing);
  });

  it('no toca el contexto si no hay Transaction previa', async () => {
    const transactions = { findOne: jest.fn().mockResolvedValue(null) };
    const step = new IdempotencyCheckStep(transactions as never);
    const context = baseContext();

    await step.execute(context);

    expect(context.existingTransaction).toBeUndefined();
  });
});
