# AGENTS.md

## Project Architecture

This repository contains the backend foundation for the KAM VOGUE Anajao ecommerce platform. The backend uses a modular Express architecture:

- `src/app.ts` wires middleware, routes, Swagger, and error handling.
- `src/server.ts` owns startup, database connection, and graceful shutdown.
- `src/config` owns environment and OpenAPI configuration.
- `src/common` owns shared errors, middleware, utilities, and common types.
- `src/database` owns database client abstractions.
- `src/modules` owns feature modules: health, identity/account access, and catalogue/inventory.
- `prisma` owns schema and migrations.
- `tests` owns unit and integration tests.

## Technology Stack

- Node.js 24 LTS target
- TypeScript strict mode
- Express.js
- MariaDB locally through XAMPP
- MySQL-compatible production database pending Truehost verification
- Prisma 7 ORM and migrations with `@prisma/adapter-mariadb`
- Zod validation
- Pino logging
- Helmet, CORS, and rate limiting
- Swagger/OpenAPI
- Vitest and Supertest
- GitHub Actions
- npm

## Coding Conventions

- Keep modules feature-oriented.
- Keep route, controller, service, validation, repository, and database responsibilities separate.
- Prefer dependency injection for infrastructure dependencies that tests need to replace.
- Avoid circular dependencies.
- Avoid premature business abstractions.
- Keep TypeScript strict checks passing.
- Use Prettier and ESLint before committing.

## Security Standards

- Never commit `.env` files or secrets.
- Do not hardcode database credentials.
- Do not expose sensitive environment or database details through public endpoints.
- Redact authorization headers and database URLs from logs.
- Keep CORS origins explicit and environment-driven.
- Use rate limiting on public routes.
- Identity uses bearer JWTs with database-backed rotating refresh families. Never accept role or status fields from customer input.
- Privileged actions require current ADMIN role and confirmed MFA in an MFA-authenticated session; recheck inside the transaction that performs the action.
- Store only digests of refresh/challenge tokens. MFA secrets use AES-256-GCM with the independent MFA_ENCRYPTION_KEY.
- Do not log request URLs/bodies, raw driver exceptions, passwords, hashes, verification secrets or tokens.
- Gmail SMTP email delivery is opt-in and injectable; SMS/social login remain unavailable pending verified integrations. Never expose test delivery sinks through HTTP.
- Catalogue admin operations must recheck account/session/current ADMIN role and confirmed MFA inside their database transaction. Catalogue lock order is account then singleton catalogue lock; use READ COMMITTED to avoid stale snapshots after waiting.
- Wholesale tiers are available only to administrator-approved accounts. Public DTOs must exclude tiers, digital asset keys and review author identities. Stock must never become negative; adjustments/imports require idempotency keys. Quotes do not reserve stock.
- Catalogue money is integer minor units with an explicit currency. M4 must revalidate price, current wholesale eligibility and availability during checkout; do not treat quotes as reservations. CSV imports are bounded, create-only and transactional; preserve formula-injection protection.

## Testing Requirements

- Unit tests should mock database dependencies where possible.
- Integration tests must use isolated databases.
- Set TEST_DATABASE_URL to a dedicated database ending in `_test`. Integration tests must never fall back to DATABASE_URL. CI sets both URLs to its isolated MariaDB service.
- Do not claim tests passed unless they were executed successfully.
- Required checks: typecheck, lint, format check, unit tests, integration tests where configured, and build.

## Git Branching Rules

- `main` is the stable baseline branch.
- `develop` is the integration branch.
- Feature work branches from `develop`.
- Milestone 1 branch: `feature/milestone-01-backend-foundation`.
- Milestone 2 branch: `feature/milestone-02-identity-access`.
- Milestone 3 branch: `feature/milestone-03-catalog-inventory`.
- Never force-push or overwrite remote history without explicit approval.
- Pull requests target `develop`.

## Milestone Completion Criteria

- Application starts successfully.
- MariaDB connection and readiness check work.
- Migrations execute successfully.
- Health and readiness endpoints behave correctly.
- Automated tests pass.
- Lint, typecheck, format check, and build pass.
- Swagger documentation is accessible.
- Postman collection exists.
- Milestone reports and next milestone prompt exist.
- Feature branch is pushed and a PR is opened against `develop`, or an access blocker is documented.

## Current Milestone Status

Milestone 1 was merged through PR #1 into main (`04b51a8`). With owner approval, develop was fast-forwarded to that baseline before Milestone 2. The confirmed repository is `ikhaliddevs/anajao-ecommerce-backend` (the prompt library's example owner is superseded).

The owner approved Milestone 2 and authorized Milestone 3. Fetch verified M2 and the Gmail/security follow-up merged into develop at `1cf28c3` through PR #6 on 2026-10-27; the M3 feature branch starts there. Earlier M2 reports remain historical execution records. Gmail SMTP is now available when configured; SMS/social integration and manual privacy fulfillment remain documented boundaries.

Milestone 3 catalogue/inventory implementation and isolated verification are recorded in `docs/milestones/milestone-03-summary.md` and `docs/milestones/milestone-03-test-report.md`. The feature branch is pushed and [PR #7](https://github.com/ikhaliddevs/anajao-ecommerce-backend/pull/7) is verified open against develop on 2026-10-28. Review handoff/PR status is in `docs/pull-request-milestone-03.md`. Wholesale approval is restricted to approved accounts by owner decision. M3 must remain unmerged pending owner review. Do not begin Milestone 4 without explicit approval.

Current commands: `npm ci`, `npm run db:generate`, `npm run db:deploy`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test:unit`, `npm run test:integration`, `npm run build`, `npm run docs:generate`, `npm run docs:validate`, `npm run test:smoke`, `npm audit --audit-level=high`. Build before docs:validate/test:smoke; smoke also requires TEST_DATABASE_URL. Start the built application with `npm start` (`dist/src/server.js`). Runtime secrets are documented in `docs/identity-access.md`.

## Instructions For Future Codex Sessions

- Read this file and `docs/setup.md` before implementation.
- Preserve Milestone 3 boundaries: no checkout/orders/payment processing, digital entitlement delivery, marketplace permissions, or live media storage. The next prompt is `docs/prompts/milestone-04-commerce-payments.md`; wait for owner approval.
- Read `docs/catalog-inventory.md` for catalogue contracts, import policies and Postman order. `docs:generate` now regenerates and formats M2/M3 Postman artifacts and OpenAPI; `docs:validate` validates both collections.
- Use `npm.cmd` on Windows PowerShell if `npm.ps1` is blocked by execution policy.
- Prefer `rg` for searching.
- Use `apply_patch` for manual file edits.
