import { NestFactory } from '@nestjs/core';
import { getDataSourceToken } from '@nestjs/typeorm';
import { hash } from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../app.module.js';
import {
  AccountRole,
  AccountStatus,
  AccountTier,
} from '../common/enums/index.js';
import { Account } from '../modules/accounts/entities/account.entity.js';
import { User } from '../modules/users/entities/user.entity.js';

/**
 * Seed de datos de prueba. Reutiliza la MISMA config de TypeORM que la app
 * (arranca un contexto Nest headless y le pide el DataSource).
 *
 * Idempotente: verifica por documentNumber / accountNumber antes de insertar,
 * así que se puede correr las veces que haga falta sin duplicar nada.
 *
 *   npm run seed
 */

const BCRYPT_ROUNDS = 10;

interface SeedUser {
  documentNumber: string;
  fullName: string;
  password: string;
  role: AccountRole;
}

interface SeedAccount {
  accountNumber: string;
  ownerDocumentNumber: string;
  tier: AccountTier;
  balance: string;
}

const USERS: SeedUser[] = [
  {
    documentNumber: 'CC-ADMIN-001',
    fullName: 'Admin FinDash',
    password: 'admin12345',
    role: AccountRole.ADMIN,
  },
  {
    documentNumber: 'CC-CLIENT-001',
    fullName: 'Cliente Basic',
    password: 'client12345',
    role: AccountRole.CLIENT,
  },
  {
    documentNumber: 'CC-CLIENT-002',
    fullName: 'Cliente Premium',
    password: 'client12345',
    role: AccountRole.CLIENT,
  },
  {
    documentNumber: 'CC-CLIENT-003',
    fullName: 'Cliente Corporate',
    password: 'client12345',
    role: AccountRole.CLIENT,
  },
];

const ACCOUNTS: SeedAccount[] = [
  {
    accountNumber: 'AC-BASIC-0001',
    ownerDocumentNumber: 'CC-CLIENT-001',
    tier: AccountTier.BASIC,
    balance: '1000.00',
  },
  {
    accountNumber: 'AC-PREMIUM-0001',
    ownerDocumentNumber: 'CC-CLIENT-002',
    tier: AccountTier.PREMIUM,
    balance: '25000.00',
  },
  {
    accountNumber: 'AC-CORP-0001',
    ownerDocumentNumber: 'CC-CLIENT-003',
    tier: AccountTier.CORPORATE,
    balance: '500000.00',
  },
];

async function upsertUser(
  users: Repository<User>,
  data: SeedUser,
): Promise<User> {
  const existing = await users.findOne({
    where: { documentNumber: data.documentNumber },
  });
  if (existing) {
    console.log(`  = usuario ${data.documentNumber} ya existe, se omite`);
    return existing;
  }

  const user = await users.save(
    users.create({
      documentNumber: data.documentNumber,
      fullName: data.fullName,
      role: data.role,
      passwordHash: await hash(data.password, BCRYPT_ROUNDS),
    }),
  );
  console.log(`  + usuario ${data.role} ${data.documentNumber} creado`);
  return user;
}

async function upsertAccount(
  accounts: Repository<Account>,
  data: SeedAccount,
  owner: User,
): Promise<void> {
  const existing = await accounts.findOne({
    where: { accountNumber: data.accountNumber },
  });
  if (existing) {
    console.log(`  = cuenta ${data.accountNumber} ya existe, se omite`);
    return;
  }

  await accounts.save(
    accounts.create({
      accountNumber: data.accountNumber,
      tier: data.tier,
      status: AccountStatus.ACTIVE,
      balance: data.balance,
      owner,
    }),
  );
  console.log(
    `  + cuenta ${data.tier} ${data.accountNumber} (saldo ${data.balance}) -> ${owner.documentNumber}`,
  );
}

async function seed(): Promise<void> {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = appContext.get<DataSource>(getDataSourceToken());
    const users = dataSource.getRepository(User);
    const accounts = dataSource.getRepository(Account);

    console.log('Seed: usuarios');
    const usersByDocument = new Map<string, User>();
    for (const data of USERS) {
      usersByDocument.set(data.documentNumber, await upsertUser(users, data));
    }

    console.log('Seed: cuentas');
    for (const data of ACCOUNTS) {
      const owner = usersByDocument.get(data.ownerDocumentNumber);
      if (!owner) {
        throw new Error(
          `owner ${data.ownerDocumentNumber} no encontrado para ${data.accountNumber}`,
        );
      }
      await upsertAccount(accounts, data, owner);
    }

    console.log('Seed completado.');
  } finally {
    await appContext.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed falló:', error);
    process.exit(1);
  });
