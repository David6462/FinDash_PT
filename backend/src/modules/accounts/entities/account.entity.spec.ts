import { Account } from './account.entity.js';
import {
  AccountStatus,
  AccountTier,
} from '../../../common/enums/index.js';

/**
 * Test de humo: no valida lógica de negocio, solo confirma que el pipeline
 * de testing (Jest + ts-jest + ESM) compila y ejecuta el código de las
 * entidades y los enums sin errores.
 */
describe('Account entity (smoke)', () => {
  it('se instancia y acepta los campos documentados', () => {
    const account = new Account();
    account.accountNumber = 'AC-0001';
    account.balance = '0.00';
    account.tier = AccountTier.PREMIUM;
    account.status = AccountStatus.ACTIVE;

    expect(account).toBeInstanceOf(Account);
    expect(account.accountNumber).toBe('AC-0001');
    expect(account.tier).toBe(AccountTier.PREMIUM);
    expect(account.status).toBe(AccountStatus.ACTIVE);
  });
});

describe('AccountTier enum', () => {
  it('tiene exactamente los 3 valores esperados', () => {
    expect(Object.values(AccountTier)).toEqual([
      'BASIC',
      'PREMIUM',
      'CORPORATE',
    ]);
  });

  it('expone literales string estables (las reglas de comisión dependen de ellos)', () => {
    expect(AccountTier.BASIC).toBe('BASIC');
    expect(AccountTier.PREMIUM).toBe('PREMIUM');
    expect(AccountTier.CORPORATE).toBe('CORPORATE');
  });
});
