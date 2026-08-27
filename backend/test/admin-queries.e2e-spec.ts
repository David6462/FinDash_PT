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
  TransactionStatus,
} from './../src/common/enums/index.js';
import { Account } from './../src/modules/accounts/entities/account.entity.js';
import { Transaction } from './../src/modules/transactions/entities/transaction.entity.js';
import { User } from './../src/modules/users/entities/user.entity.js';
import { FRAUD_CHECKER } from './../src/modules/transactions/fraud-check/fraud-check.interface.js';
import { ensureSeedFixtures } from './support/fixtures.js';

const Q_PREFIX = 'E2EQ'; // usuarios/cuentas propios de este spec de paginación
const RUN = Date.now();

describe('Consultas admin + historial cliente (e2e)', () => {
  let app: INestApplication<App>;
  let ds: DataSource;

  // ids de cuentas de referencia (del seed)
  let basicAccountId: string;
  let premiumAccountId: string;
  let corpAccountId: string;

  // ids de transacciones del set controlado
  const txId: Record<string, string> = {};

  const login = (documentNumber: string, password = 'client12345') =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ documentNumber, password })
      .expect(200)
      .then((res) => res.body.accessToken as string);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FRAUD_CHECKER)
      .useValue({ check: async () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    ds = app.get<DataSource>(getDataSourceToken());

    await ensureSeedFixtures(ds);

    const accounts = ds.getRepository(Account);
    const users = ds.getRepository(User);
    const transactions = ds.getRepository(Transaction);

    basicAccountId = (await accounts.findOneByOrFail({
      accountNumber: 'AC-BASIC-0001',
    })).id;
    premiumAccountId = (await accounts.findOneByOrFail({
      accountNumber: 'AC-PREMIUM-0001',
    })).id;
    corpAccountId = (await accounts.findOneByOrFail({
      accountNumber: 'AC-CORP-0001',
    })).id;

    // 15 cuentas propias del spec para probar paginación/filtros de forma
    // determinista (independiente de lo que haya en la DB).
    for (let i = 1; i <= 15; i++) {
      const n = String(i).padStart(2, '0');
      const documentNumber = `${Q_PREFIX}-${n}`;
      if (!(await users.findOneBy({ documentNumber }))) {
        const owner = await users.save(
          users.create({
            documentNumber,
            fullName: `Query Tester ${n}`,
            role: AccountRole.CLIENT,
            passwordHash: await hash('client12345', 10),
          }),
        );
        await accounts.save(
          accounts.create({
            accountNumber: `${Q_PREFIX}-ACC-${n}`,
            owner,
            tier: AccountTier.BASIC,
            // las 3 últimas quedan BLOCKED
            status: i > 12 ? AccountStatus.BLOCKED : AccountStatus.ACTIVE,
            balance: '0.00',
          }),
        );
      }
    }

    // Set controlado de transacciones: se limpia la tabla y se inserta un
    // conjunto conocido para poder verificar números EXACTOS en el dashboard.
    await ds.query('TRUNCATE TABLE transactions');

    const insert = async (
      key: string,
      sourceId: string,
      destId: string,
      amount: string,
      status: TransactionStatus,
    ) => {
      const saved = await transactions.save(
        transactions.create({
          sourceAccount: { id: sourceId },
          destinationAccount: { id: destId },
          amount,
          commissionCharged: '0.00',
          totalDebited: amount,
          status,
          rejectionReason:
            status === TransactionStatus.REJECTED ? 'Fondos insuficientes' : null,
          authorizationCode:
            status === TransactionStatus.COMPLETED ? 'AUTH-DEADBEEF' : null,
          idempotencyKey: `e2e-q-${RUN}-${key}`,
        }),
      );
      txId[key] = saved.id;
      return saved;
    };

    await insert('T1', basicAccountId, premiumAccountId, '100.00', TransactionStatus.COMPLETED);
    await insert('T2', basicAccountId, premiumAccountId, '200.00', TransactionStatus.COMPLETED);
    await insert('T3', premiumAccountId, basicAccountId, '500.00', TransactionStatus.COMPLETED);
    await insert('T4', premiumAccountId, corpAccountId, '42.00', TransactionStatus.COMPLETED);
    await insert('T5', basicAccountId, premiumAccountId, '777.00', TransactionStatus.REJECTED);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─────────────────────────── GET /accounts ───────────────────────────

  it('GET /accounts sin token -> 401', () =>
    request(app.getHttpServer()).get('/accounts').expect(401));

  it('GET /accounts como CLIENT -> 403', async () => {
    const token = await login('CC-CLIENT-001');
    await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /accounts?limit=100 -> 400 (limit máx 50)', async () => {
    const token = await login('CC-ADMIN-001', 'admin12345');
    await request(app.getHttpServer())
      .get('/accounts?limit=100')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('GET /accounts pagina y NO devuelve passwordHash del owner', async () => {
    const token = await login('CC-ADMIN-001', 'admin12345');

    const page1 = await request(app.getHttpServer())
      .get(`/accounts?documentNumber=${Q_PREFIX}&page=1&limit=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(page1.body.data).toHaveLength(10);
    expect(page1.body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 15,
      totalPages: 2,
    });
    expect(page1.body.data[0].owner).toBeDefined();
    expect(page1.body.data[0].owner.passwordHash).toBeUndefined();

    const page2 = await request(app.getHttpServer())
      .get(`/accounts?documentNumber=${Q_PREFIX}&page=2&limit=10`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(page2.body.data).toHaveLength(5);
    // páginas disjuntas
    const idsPage1 = new Set(page1.body.data.map((a: Account) => a.id));
    const overlap = page2.body.data.filter((a: Account) => idsPage1.has(a.id));
    expect(overlap).toHaveLength(0);
  });

  it('GET /accounts filtra por status exacto', async () => {
    const token = await login('CC-ADMIN-001', 'admin12345');

    const res = await request(app.getHttpServer())
      .get(`/accounts?documentNumber=${Q_PREFIX}&status=BLOCKED&limit=50`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.meta.total).toBe(3);
    expect(
      res.body.data.every((a: Account) => a.status === AccountStatus.BLOCKED),
    ).toBe(true);
  });

  it('GET /accounts filtra por documentNumber parcial (ILIKE)', async () => {
    const token = await login('CC-ADMIN-001', 'admin12345');

    // "E2EQ-1" NO es substring de "E2EQ-01".."E2EQ-09" pero SÍ de "E2EQ-10".."E2EQ-15"
    const res = await request(app.getHttpServer())
      .get(`/accounts?documentNumber=${Q_PREFIX}-1&limit=50`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.meta.total).toBe(6);
  });

  // ─────────────────────── GET /transactions/me ────────────────────────

  it('GET /transactions/me: el cliente ve solo sus movimientos (origen o destino), ordenados DESC', async () => {
    const token = await login('CC-CLIENT-001');

    const res = await request(app.getHttpServer())
      .get('/transactions/me?page=1&limit=20')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const ids = res.body.data.map((t: Transaction) => t.id).sort();
    // T1, T2 (origen), T3 (destino), T5 (origen). NO T4 (PREMIUM -> CORP).
    expect(ids).toEqual(
      [txId.T1, txId.T2, txId.T3, txId.T5].sort(),
    );
    expect(res.body.meta.total).toBe(4);
    expect(ids).not.toContain(txId.T4);

    // orden por createdAt DESC
    const dates = res.body.data.map((t: Transaction) =>
      new Date(t.createdAt).getTime(),
    );
    expect(dates).toEqual([...dates].sort((a, b) => b - a));

    // incluye una donde es origen y una donde es destino
    const asSource = res.body.data.some(
      (t: Transaction) => t.sourceAccount?.id === basicAccountId,
    );
    const asDest = res.body.data.some(
      (t: Transaction) => t.destinationAccount?.id === basicAccountId,
    );
    expect(asSource && asDest).toBe(true);
  });

  it('GET /transactions/me: paginación', async () => {
    const token = await login('CC-CLIENT-001');
    const res = await request(app.getHttpServer())
      .get('/transactions/me?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({
      page: 1,
      limit: 2,
      total: 4,
      totalPages: 2,
    });
  });

  it('GET /transactions/me: otro cliente ve un set distinto', async () => {
    const token = await login('CC-CLIENT-003');
    const res = await request(app.getHttpServer())
      .get('/transactions/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // CC-CLIENT-003 (CORP) solo aparece como destino en T4
    expect(res.body.meta.total).toBe(1);
    expect(res.body.data[0].id).toBe(txId.T4);
  });

  // ────────────────────────── GET /dashboard ───────────────────────────

  it('GET /dashboard/kpis: números exactos del set controlado', async () => {
    const token = await login('CC-ADMIN-001', 'admin12345');
    const res = await request(app.getHttpServer())
      .get('/dashboard/kpis')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // COMPLETED: 100 + 200 + 500 + 42 = 842.00 ; REJECTED: 1
    expect(res.body).toEqual({
      totalVolumeTransacted: '842.00',
      failedTransactionsCount: 1,
    });
  });

  it('GET /dashboard/volume-by-tier: siempre los 3 tiers, CORPORATE en cero', async () => {
    const token = await login('CC-ADMIN-001', 'admin12345');
    const res = await request(app.getHttpServer())
      .get('/dashboard/volume-by-tier')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual([
      { tier: 'BASIC', totalVolume: '300.00', transactionCount: 2 },
      { tier: 'PREMIUM', totalVolume: '542.00', transactionCount: 2 },
      { tier: 'CORPORATE', totalVolume: '0.00', transactionCount: 0 },
    ]);
  });

  it('GET /dashboard/kpis y /dashboard/volume-by-tier como CLIENT -> 403', async () => {
    const token = await login('CC-CLIENT-001');
    await request(app.getHttpServer())
      .get('/dashboard/kpis')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/dashboard/volume-by-tier')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
