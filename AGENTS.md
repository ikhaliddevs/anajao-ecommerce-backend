# AGENTS.md

## Project Architecture

This repository contains the backend foundation for the KAM VOGUE Anajao ecommerce platform. The backend uses a modular Express architecture:

- `src/app.ts` wires middleware, routes, Swagger, and error handling.
- `src/server.ts` owns startup, database connection, and graceful shutdown.
- `src/config` owns environment and OpenAPI configuration.
- `src/common` owns shared errors, middleware, utilities, and common types.
- `src/database` owns database client abstractions.
- `src/modules` owns feature modules. Milestone 1 includes only the health module.
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

## Testing Requirements

- Unit tests should mock database dependencies where possible.
- Integration tests must use isolated databases.
- Do not claim tests passed unless they were executed successfully.
- Required checks: typecheck, lint, format check, unit tests, integration tests where configured, and build.

## Git Branching Rules

- `main` is the stable baseline branch.
- `develop` is the integration branch.
- Feature work branches from `develop`.
- Milestone 1 branch: `feature/milestone-01-backend-foundation`.
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

Milestone 1 implementation is locally verified, committed, and pushed to `feature/milestone-01-backend-foundation`. Pull request creation is pending because the local shell does not have GitHub CLI installed. Use the compare URL in `docs/pull-request-milestone-01.md`.

## Instructions For Future Codex Sessions

- Read this file and `docs/setup.md` before implementation.
- Preserve Milestone 1 scope boundaries unless the user explicitly approves the next milestone.
- Use `npm.cmd` on Windows PowerShell if `npm.ps1` is blocked by execution policy.
- Prefer `rg` for searching.
- Use `apply_patch` for manual file edits.
