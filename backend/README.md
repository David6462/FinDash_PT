<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Base de datos y datos de prueba

1. Levantar Postgres (desde la raíz del repo):

   ```bash
   $ docker compose up -d
   ```

2. Sembrar los datos de prueba **antes de usar la app**:

   ```bash
   $ npm run seed
   ```

   El seed es idempotente (se puede correr varias veces) y crea:

   | documentNumber  | password      | role   | cuenta / tier / saldo                    |
   | --------------- | ------------- | ------ | ---------------------------------------- |
   | `CC-ADMIN-001`  | `admin12345`  | ADMIN  | —                                        |
   | `CC-CLIENT-001` | `client12345` | CLIENT | `AC-BASIC-0001` · BASIC · 1000.00        |
   | `CC-CLIENT-002` | `client12345` | CLIENT | `AC-PREMIUM-0001` · PREMIUM · 25000.00   |
   | `CC-CLIENT-003` | `client12345` | CLIENT | `AC-CORP-0001` · CORPORATE · 500000.00   |

   > El endpoint público `POST /auth/register` **siempre** crea usuarios `CLIENT`.
   > El usuario `ADMIN` solo se puede crear con este seed.

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage (solo unit, sin DB)
$ npm run test:cov

# cobertura combinada unit + e2e (número de gate, requiere Postgres)
$ npm run test:cov:all
```

## Motor de transferencias

`POST /transactions/transfer` — solo rol `CLIENT`.

- Header **obligatorio** `X-Idempotency-Key`: reintentar con la misma key y el
  mismo body devuelve la misma `Transaction`, no duplica ni falla.
- Body: `{ "destinationAccountNumber": string, "amount": number }` (máx. 2 decimales).
- Comisión según el tier de la cuenta origen: BASIC 2%, PREMIUM 0, CORPORATE 5 fijo.
- Se descuenta `amount + comisión` del origen; el destino recibe `amount` exacto.
- Toda la aritmética monetaria con `decimal.js` (nunca floats).
- Antifraude simulado con latencia de `FRAUD_CHECK_MIN/MAX_DELAY_MS` (default
  1000–10000) y timeout de `FRAUD_CHECK_TIMEOUT_MS`. Para probar el flujo feliz
  a mano, bajá el rango en el `.env` (p. ej. `100`–`300`).

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"documentNumber":"CC-CLIENT-001","password":"client12345"}' | jq -r .accessToken)

curl -X POST http://localhost:3000/transactions/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'X-Idempotency-Key: mi-key-unica-123' \
  -d '{"destinationAccountNumber":"AC-PREMIUM-0001","amount":250.50}'
```

## Consultas y dashboard

Respuesta paginada estándar: `{ data: [...], meta: { page, limit, total, totalPages } }`.
`page` default 1, `limit` default 10 (máx 50).

| Endpoint | Rol | Descripción |
| --- | --- | --- |
| `GET /accounts?page=&limit=&documentNumber=&status=` | ADMIN | Listado paginado de cuentas + owner. `documentNumber` filtra por el documento del owner (parcial, ILIKE); `status` exacto (`ACTIVE`/`BLOCKED`). |
| `GET /transactions/me?page=&limit=` | autenticado | Movimientos del usuario (donde alguna de sus cuentas es origen **o** destino), más recientes primero. |
| `GET /dashboard/kpis` | ADMIN | `{ totalVolumeTransacted, failedTransactionsCount }` — SUM/COUNT a nivel SQL. |
| `GET /dashboard/volume-by-tier` | ADMIN | Volumen COMPLETED agrupado por tier de la cuenta origen. Siempre devuelve los 3 tiers (ausentes en `0.00` / `0`). |

```bash
ADMIN=$(curl -s -X POST http://localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"documentNumber":"CC-ADMIN-001","password":"admin12345"}' | jq -r .accessToken)

curl "http://localhost:3000/accounts?page=1&limit=10&status=ACTIVE" -H "Authorization: Bearer $ADMIN"
curl "http://localhost:3000/dashboard/kpis"           -H "Authorization: Bearer $ADMIN"
curl "http://localhost:3000/dashboard/volume-by-tier" -H "Authorization: Bearer $ADMIN"
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
