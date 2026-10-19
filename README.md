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
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Authentication

Copy `.env.example` to `.env` and set the PostgreSQL values, a unique random
`JWT_SECRET` of at least 32 characters, `JWT_ALGORITHM=HS256`, and
`JWT_EXPIRES_IN` in seconds. The API rejects missing/weak JWT configuration.
New passwords use Argon2id (minimum 12 characters, maximum 128). Existing bcrypt
hashes are upgraded after a successful login. Existing plaintext passwords are
converted by the explicit one-time `pnpm passwords:migrate-legacy` command; run
it after taking a database backup and before exposing the upgraded API.

### Initial setup

Apply schema changes, then provision the administrator using the environment
variables `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL`, and
`INITIAL_ADMIN_PASSWORD` (minimum 12 characters):

```bash
pnpm migration:show
pnpm migration:run
pnpm passwords:migrate-legacy
pnpm bootstrap:admin
pnpm start:dev
```

The bootstrap validates its inputs before connecting and creates the first
administrator, system role, and permission catalog in one transaction. It never
stores a credential in a migration, logs secret values, or overwrites an
existing account. Re-running it does not create or reset an administrator.
Remove the initial-admin variables from the deployment environment after setup.

### API access

- `POST /auth/login` accepts `{ "email": "...", "password": "..." }` and
  returns an `accessToken`; attempts are limited to five per minute per client.
- Send protected requests with `Authorization: Bearer <accessToken>`.
- `GET /auth/me` returns the current user's profile.
- `POST /auth/password/change` takes `currentPassword`, `newPassword`, and
  `confirmNewPassword`; it returns a replacement token and invalidates all older
  tokens for that account.
- `POST /auth/logout` invalidates all tokens for the current account.
- `/users`, `/roles`, and `/permissions` require explicit permission metadata;
  multiple permissions on a route are all required. Missing metadata denies
  access. New endpoint permissions must be added to the bootstrap catalog and
  explicitly applied with `@RequirePermissions`.
- Users created by an administrator must change their password before accessing
  normal endpoints. User state and permissions are loaded from PostgreSQL for
  each request, so deactivation and RBAC changes take effect immediately.

### Migrations

Use `pnpm migration:generate <Name>` to generate a migration, `pnpm migration:run`
to apply pending migrations, `pnpm migration:show` to inspect status, and
`pnpm migration:revert` to revert the latest migration. The new security
migration adds columns, indexes, RBAC tables, and audit storage without dropping
the existing `User` table. It refuses to add the case-normalized unique email
index when duplicate addresses exist; resolve those records before retrying.
The base user migration creates `uuid-ossp` idempotently for fresh databases.
Its rollback removes RBAC associations/schema and the new user columns but does
not delete administrator rows; users left without roles cannot access protected
routes until a valid role is assigned again. Do not run rollback without a
backup and an access recovery plan.

Audit rows are retained indefinitely by default so deployments do not silently
discard security evidence. Set and enforce a retention period according to the
organization's legal/compliance policy before production rollout.

Rate limiting currently uses in-memory storage. Multi-instance deployments need
a shared throttler store (for example Redis). Refresh tokens are not issued;
short-lived access tokens plus `tokenVersion` revocation are used instead.

## Produtos, estoque, clientes e pedidos

Os contextos `products`, `customers`, `stock`, `orders` e `logistics` possuem
módulos NestJS, controllers em `presentation/controllers`, DTOs e casos de uso
em `application/`. Usuários, autenticação e acesso seguem a mesma organização.
As entidades TypeORM específicas ficam em `src/infra/<contexto>/entities`; a
configuração, auditoria global e migrations permanecem em `src/infra/data/`.
`OperationsModule` fornece apenas o suporte às transações que cruzam pedidos e
estoque; os controllers não dependem de um serviço de operações genérico.

A migration `1800000000000-CreateCommerceOperations` cria produtos, clientes,
saldos, movimentações, pedidos, itens e histórico de status. Execute
`pnpm migration:run` para aplicá-la e `pnpm migration:revert` para reverter a
última migration. O catálogo das permissões é inserido sem atribuição
automática a papéis existentes; associe-as em `/roles/:id/permissions`. O
rollback remove as tabelas do domínio, mas preserva o catálogo RBAC e suas
associações administradas.

Os casos de uso mantêm acesso TypeORM no suporte transacional compartilhado
para preservar atomicidade entre estoque e pedidos. A extração desse limite
para portas de repositório/UoW permanece uma evolução arquitetural pendente.

O saldo usa `numeric(14,3)` e o backend mantém quantidades decimais como strings
e unidades inteiras de milésimo durante os cálculos. Entradas, saídas e ajustes
são transacionais, registram usuário, motivo e saldos anterior/posterior, e
aceitam `Idempotency-Key`. A disponibilidade é saldo físico menos reservas.
Ao criar o pedido, os itens são validados e reservados em uma transação com
bloqueio das linhas de saldo; o pedido entra em `PENDING`. A logística assume
em `PROCESSING`, prepara em `READY_FOR_SHIPMENT`, e o despacho para `IN_TRANSIT`
baixa saldo físico e reserva uma única vez. Cancelamentos antes do despacho
liberam a reserva. `DELIVERED` não altera estoque. Preços, rascunhos, múltiplos
depósitos e comprovantes não foram adicionados sem regra operacional definida.

Principais rotas (todas exigem bearer JWT e permissão declarada):

- Produtos: `POST/GET /products`, `GET/PATCH /products/:id`, ativação,
  `GET /products/:id/stock` e `/stock-movements`.
- Clientes: `POST/GET /customers`, `GET /customers/by-document/:document`,
  ou `GET /customers/by-document?document=11.222.333%2F0001-81`,
  `GET/PATCH /customers/:id`, ativação/desativação e histórico de pedidos.
  CPF/CNPJ são normalizados e validados; o índice único PostgreSQL cobre
  concorrência. CNPJ alfanumérico também é aceito.
- Estoque: `POST /stock/entries`, `/exits`, `/adjustments`, `GET /stock/balances`
  e `/stock/movements`. Quantidades são positivas, com até três casas decimais.
- Pedidos: `POST/GET /orders`, `GET /orders/my-orders`, `GET /orders/:id`,
  `GET /orders/:id/history` e `POST /orders/:id/cancel`. Repetir a criação com
  a mesma `Idempotency-Key` retorna o pedido original do mesmo usuário.
- Logística: `GET /logistics/orders` e as operações `start-processing`,
  `ready-for-shipment`, `dispatch` e `confirm-delivery` em `/logistics/orders/:id`.

Exemplos de entrada e pedido:

```json
{
  "productId": "uuid-do-produto",
  "quantity": "12.500",
  "reason": "Recebimento da nota fiscal"
}
```

```json
{
  "customerId": "uuid-do-cliente",
  "items": [{ "productId": "uuid-do-produto", "quantity": "2.000" }],
  "customerNotes": "Entrega pela manhã"
}
```

Permissões principais: `products.create/read/update/deactivate`,
`products.stock.read`, `stock.read/entry/exit/adjust/movements.read`,
`customers.create/read/update/deactivate`, `orders.create/read/read.all/cancel`,
`orders.cancel.all` e `logistics.orders.read/process/prepare-shipment/dispatch/
confirm-delivery`. `orders.read` limita vendedores aos próprios pedidos;
`orders.read.all` amplia o escopo. A fila logística exige permissão própria.

Verificações: `pnpm test -- --runInBand`, `pnpm test:e2e -- --runInBand` e
`pnpm build`.
Testes concorrentes de migrations/transações requerem PostgreSQL configurado
pelas variáveis `DB_*`.

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
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
