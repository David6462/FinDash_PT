import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { hash } from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import {
  AccountRole,
  AccountStatus,
  AccountTier,
} from './../src/common/enums/index.js';
import { Account } from './../src/modules/accounts/entities/account.entity.js';
import { Transaction } from './../src/modules/transactions/entities/transaction.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { FRAUD_CHECKER } from './../src/modules/transactions/fraud-check/fraud-check.interface.js';

const SOURCE_ACCOUNT = 'AC-BASIC-0001'; // CC-CLIENT-001, tier BASIC (2%)
const DESTINATION_ACCOUNT = 'AC-PREMIUM-0001'; // CC-CLIENT-002
const SOURCE_START_BALANCE = '1000.00';
const DESTINATION_START_BALANCE = '25000.00';

/**
 * Garantiza que existan los usuarios/cuentas del seed que estos tests usan
 * (mismo dataset que `npm run seed`, pero autocontenido para poder correr los
 * e2e aunque el seed no se haya ejecutado).
 */
async function ensureFixtures(dataSource: DataSource): Promise<void> {
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
  ): Promise<void> => {
    if (await accounts.findOneBy({ accountNumber })) return;
    await accounts.save(
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
  const client1 = await upsertUser(
    'CC-CLIENT-001',
    'Cliente Basic',
    'client12345',
    AccountRole.CLIENT,
  );
  const client2 = await upsertUser(
    'CC-CLIENT-002',
    'Cliente Premium',
    'client12345',
    AccountRole.CLIENT,
  );
  await upsertAccount(SOURCE_ACCOUNT, client1, AccountTier.BASIC, SOURCE_START_BALANCE);
  await upsertAccount(
    DESTINATION_ACCOUNT,
    client2,
    AccountTier.PREMIUM,
    DESTINATION_START_BALANCE,
  );
}

describe('Transferencias (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  const login = (documentNumber: string, password: string) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ documentNumber, password })
      .expect(200)
      .then((res) => res.body.accessToken as string);

  const balanceOf = async (accountNumber: string) => {
    const account = await dataSource
      .getRepository(Account)
      .findOneByOrFail({ accountNumber });
    return account.balance;
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Antifraude instantáneo: no queremos suites de 10s por caso.
      .overrideProvider(FRAUD_CHECKER)
      .useValue({ check: async () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = app.get<DataSource>(getDataSourceToken());
    await ensureFixtures(dataSource);
  });

  beforeEach(async () => {
    // Saldos deterministas para cada test.
    const accounts = dataSource.getRepository(Account);
    await accounts.update(
      { accountNumber: SOURCE_ACCOUNT },
      { balance: SOURCE_START_BALANCE },
    );
    await accounts.update(
      { accountNumber: DESTINATION_ACCOUNT },
      { balance: DESTINATION_START_BALANCE },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('flujo feliz: CC-CLIENT-001 (BASIC 2%) transfiere 100 a CC-CLIENT-002', async () => {
    const token = await login('CC-CLIENT-001', 'client12345');
    const idempotencyKey = `e2e-happy-${Date.now()}`;

    const res = await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({ destinationAccountNumber: DESTINATION_ACCOUNT, amount: 100 })
      .expect(201);

    expect(res.body).toMatchObject({
      status: 'COMPLETED',
      amount: '100.00',
      commissionCharged: '2.00',
      totalDebited: '102.00',
    });
    expect(res.body.authorizationCode).toMatch(/^AUTH-[0-9A-F]{8}$/);

    // Origen bajó monto + 2%; destino subió el monto EXACTO (sin comisión).
    expect(await balanceOf(SOURCE_ACCOUNT)).toBe('898.00');
    expect(await balanceOf(DESTINATION_ACCOUNT)).toBe('25100.00');
  });

  it('idempotencia: dos requests con la misma X-Idempotency-Key devuelven la MISMA transacción', async () => {
    const token = await login('CC-CLIENT-001', 'client12345');
    const idempotencyKey = `e2e-idem-${Date.now()}`;
    const body = { destinationAccountNumber: DESTINATION_ACCOUNT, amount: 50 };

    const first = await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send(body)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);

    // Solo se aplicó UNA vez: 1000 - 51 = 949.
    expect(await balanceOf(SOURCE_ACCOUNT)).toBe('949.00');

    const count = await dataSource
      .getRepository(Transaction)
      .countBy({ idempotencyKey });
    expect(count).toBe(1);
  });

  it('fondos insuficientes: responde 400 y deja la Transaction en REJECTED (sin mover saldos)', async () => {
    const token = await login('CC-CLIENT-001', 'client12345');
    const idempotencyKey = `e2e-insuf-${Date.now()}`;

    await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', idempotencyKey)
      .send({ destinationAccountNumber: DESTINATION_ACCOUNT, amount: 999999 })
      .expect(400);

    const rejected = await dataSource
      .getRepository(Transaction)
      .findOneByOrFail({ idempotencyKey });
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Fondos insuficientes');
    expect(rejected.authorizationCode).toBeNull();

    // Saldos intactos.
    expect(await balanceOf(SOURCE_ACCOUNT)).toBe(SOURCE_START_BALANCE);
    expect(await balanceOf(DESTINATION_ACCOUNT)).toBe(DESTINATION_START_BALANCE);
  });

  it('falta el header X-Idempotency-Key: responde 400 explícito', async () => {
    const token = await login('CC-CLIENT-001', 'client12345');

    const res = await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .send({ destinationAccountNumber: DESTINATION_ACCOUNT, amount: 10 })
      .expect(400);

    expect(res.body.message).toBe('X-Idempotency-Key header es requerido');
  });

  it('un ADMIN no puede transferir: 403', async () => {
    const token = await login('CC-ADMIN-001', 'admin12345');

    await request(app.getHttpServer())
      .post('/transactions/transfer')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', `e2e-admin-${Date.now()}`)
      .send({ destinationAccountNumber: DESTINATION_ACCOUNT, amount: 10 })
      .expect(403);
  });
});
