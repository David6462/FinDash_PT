import { hash } from 'bcrypt';
import { DataSource } from 'typeorm';
import {
  AccountRole,
  AccountStatus,
  AccountTier,
} from '../../src/common/enums/index.js';
import { Account } from '../../src/modules/accounts/entities/account.entity.js';
import { User } from '../../src/modules/users/entities/user.entity.js';

/**
 * Crea (si no existen) los usuarios y cuentas del seed que usan los e2e.
 * Mismo dataset que `npm run seed`, pero autocontenido.
 */
export async function ensureSeedFixtures(dataSource: DataSource): Promise<void> {
  const users = dataSource.getRepository(User);
  const accounts = dataSource.getRepository(Account);

  const upsertUser = async (
    documentNumber: string,
    fullName: string,
    password: string,
    role: AccountRole,
  ): Promise<User> => {
    const existing = await users.findOneBy({ documentNumber });
    if (existing) return existing;
    return users.save(
      users.create({
        documentNumber,
        fullName,
        role,
        passwordHash: await hash(password, 10),
      }),
    );
  };

  const upsertAccount = async (
    accountNumber: string,
    owner: User,
    tier: AccountTier,
    balance: string,
  ): Promise<Account> => {
    const existing = await accounts.findOneBy({ accountNumber });
    if (existing) return existing;
    return accounts.save(
      accounts.create({
        accountNumber,
        owner,
        tier,
        status: AccountStatus.ACTIVE,
        balance,
      }),
    );
  };

  await upsertUser('CC-ADMIN-001', 'Admin FinDash', 'admin12345', AccountRole.ADMIN);
  const c1 = await upsertUser('CC-CLIENT-001', 'Cliente Basic', 'client12345', AccountRole.CLIENT);
  const c2 = await upsertUser('CC-CLIENT-002', 'Cliente Premium', 'client12345', AccountRole.CLIENT);
  const c3 = await upsertUser('CC-CLIENT-003', 'Cliente Corporate', 'client12345', AccountRole.CLIENT);
  await upsertAccount('AC-BASIC-0001', c1, AccountTier.BASIC, '1000.00');
  await upsertAccount('AC-PREMIUM-0001', c2, AccountTier.PREMIUM, '25000.00');
  await upsertAccount('AC-CORP-0001', c3, AccountTier.CORPORATE, '500000.00');
}
