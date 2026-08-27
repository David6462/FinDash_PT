import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { AccountRole } from './../src/common/enums/index.js';

describe('Auth + RBAC (e2e)', () => {
  let app: INestApplication<App>;

  // documentNumber único por corrida: la columna es UNIQUE en la DB.
  const documentNumber = `E2E-${Date.now()}`;
  const password = 'secret123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register crea el usuario como CLIENT y NO devuelve passwordHash', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        documentNumber,
        fullName: 'E2E Tester',
        password,
      })
      .expect(201);

    expect(res.body).toMatchObject({ documentNumber, role: AccountRole.CLIENT });
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.id).toEqual(expect.any(String));
  });

  it('POST /auth/register ignora un "role" colado en el body: el usuario se crea CLIENT, nunca ADMIN', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        documentNumber: `${documentNumber}-admin-attempt`,
        fullName: 'Mallory',
        password,
        role: AccountRole.ADMIN,
      })
      .expect(201);

    expect(res.body.role).toBe(AccountRole.CLIENT);
  });

  it('POST /auth/register con password corta -> 400', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ documentNumber: `${documentNumber}-x`, fullName: 'X', password: '123' })
      .expect(400);
  });

  it('POST /auth/login devuelve un accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ documentNumber, password })
      .expect(200);

    expect(res.body.accessToken).toEqual(expect.any(String));
  });

  it('POST /auth/login con credenciales inválidas -> 401 con el mismo mensaje (no user enumeration)', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ documentNumber, password: 'password-incorrecta' })
      .expect(401);

    const unknownUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ documentNumber: 'NO-EXISTE-0000', password: 'cualquiera1' })
      .expect(401);

    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it('GET /accounts/me sin token -> 401', () => {
    return request(app.getHttpServer()).get('/accounts/me').expect(401);
  });

  it('GET /accounts/me con el JWT del login -> 200 y devuelve una lista', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ documentNumber, password })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/accounts/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
