import { jest } from '@jest/globals';
import { Decimal } from 'decimal.js';
import {
  AccountStatus,
  AccountTier,
} from '../../../../common/enums/index.js';
import {
  AccountNotFoundException,
  InactiveAccountException,
  SelfTransferException,
} from '../../exceptions/index.js';
import { LoadAndValidateAccountsStep } from './load-and-validate-accounts.step.js';
import type { TransferContext } from '../transfer-context.interface.js';

const USER_ID = 'user-1';

function makeAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: 'src-acc',
    accountNumber: 'AC-SRC',
    balance: '1000.00',
    tier: AccountTier.BASIC,
    status: AccountStatus.ACTIVE,
    owner: { id: USER_ID },
    ...overrides,
  };
}

function context(): TransferContext {
  return {
    dto: { destinationAccountNumber: 'AC-DST', amount: 100 },
    idempotencyKey: 'key-1',
    requestingUserId: USER_ID,
    amount: new Decimal(100),
  };
}

/** repo.findOne mock: 1ª llamada = source (por owner), 2ª = destination. */
function repoReturning(source: unknown, destination: unknown) {
  const findOne = jest
    .fn()
    .mockResolvedValueOnce(source)
    .mockResolvedValueOnce(destination);
  return { findOne, repo: { findOne } };
}

describe('LoadAndValidateAccountsStep', () => {
  it('carga ambas cuentas en el contexto en el caso feliz', async () => {
    const source = makeAccount({ id: 'src' });
    const destination = makeAccount({ id: 'dst', accountNumber: 'AC-DST' });
    const { repo } = repoReturning(source, destination);
    const step = new LoadAndValidateAccountsStep(repo as never);
    const ctx = context();

    await step.execute(ctx);

    expect(ctx.sourceAccount).toBe(source);
    expect(ctx.destinationAccount).toBe(destination);
  });

  it('lanza AccountNotFoundException si el usuario no tiene cuenta origen', async () => {
    const { repo } = repoReturning(null, makeAccount({ id: 'dst' }));
    const step = new LoadAndValidateAccountsStep(repo as never);

    await expect(step.execute(context())).rejects.toBeInstanceOf(
      AccountNotFoundException,
    );
  });

  it('lanza AccountNotFoundException si la cuenta destino no existe', async () => {
    const { repo } = repoReturning(makeAccount({ id: 'src' }), null);
    const step = new LoadAndValidateAccountsStep(repo as never);

    await expect(step.execute(context())).rejects.toBeInstanceOf(
      AccountNotFoundException,
    );
  });

  it('lanza SelfTransferException si origen y destino son la misma cuenta', async () => {
    const same = makeAccount({ id: 'same' });
    const { repo } = repoReturning(same, same);
    const step = new LoadAndValidateAccountsStep(repo as never);

    await expect(step.execute(context())).rejects.toBeInstanceOf(
      SelfTransferException,
    );
  });

  it('lanza InactiveAccountException si la cuenta origen está BLOCKED', async () => {
    const source = makeAccount({ id: 'src', status: AccountStatus.BLOCKED });
    const destination = makeAccount({ id: 'dst' });
    const { repo } = repoReturning(source, destination);
    const step = new LoadAndValidateAccountsStep(repo as never);

    await expect(step.execute(context())).rejects.toBeInstanceOf(
      InactiveAccountException,
    );
  });

  it('lanza AccountNotFoundException si la cuenta origen no pertenece al usuario autenticado', async () => {
    const source = makeAccount({ id: 'src', owner: { id: 'otro-usuario' } });
    const destination = makeAccount({ id: 'dst' });
    const { repo } = repoReturning(source, destination);
    const step = new LoadAndValidateAccountsStep(repo as never);

    await expect(step.execute(context())).rejects.toBeInstanceOf(
      AccountNotFoundException,
    );
  });

  it('lanza InactiveAccountException si la cuenta destino está BLOCKED', async () => {
    const source = makeAccount({ id: 'src' });
    const destination = makeAccount({
      id: 'dst',
      status: AccountStatus.BLOCKED,
    });
    const { repo } = repoReturning(source, destination);
    const step = new LoadAndValidateAccountsStep(repo as never);

    await expect(step.execute(context())).rejects.toBeInstanceOf(
      InactiveAccountException,
    );
  });
});
