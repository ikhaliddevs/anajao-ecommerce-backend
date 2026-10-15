# Milestone 01 Test Report

## Commands Executed

```bash
npm run db:generate
npm run db:deploy
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run test:integration
npm run build
node dist/src/server.js
```

## Planned Test Coverage

- Application factory creates successfully.
- Health endpoint returns `200`.
- Readiness endpoint returns `200` when the database dependency is ready.
- Readiness endpoint returns `503` when the database dependency is unavailable.
- Unknown routes return a consistent `404` JSON error.
- Centralized error handler returns expected operational errors.
- Request validation returns a `400` validation error.
- Environment configuration errors throw `EnvValidationError`.
- Integration readiness test runs only when `DATABASE_URL` is configured.

## Execution Evidence

- `npm run db:generate`: passed; Prisma Client 7.10.0 generated to `src/generated/prisma`.
- `npm run db:deploy`: passed; migration `20261013180000_init` applied to local XAMPP MariaDB database `anajao_ecommerce_dev`.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test:unit`: passed; 1 test file, 8 tests.
- `npm run test:integration`: passed; 1 test file, 1 test using local MariaDB readiness.
- `npm run build`: passed.
- Built server startup: passed with `node dist/src/server.js`.
- `GET /api/v1/health`: passed with HTTP 200.
- `GET /api/v1/ready`: passed with HTTP 200.
- `GET /api-docs`: passed with HTTP 200 after Swagger redirect.

## Unresolved Failures

No local verification failures remain. GitHub push and pull request creation are tracked separately from local test execution.
