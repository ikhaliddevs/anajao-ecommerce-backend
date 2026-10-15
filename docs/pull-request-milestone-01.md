# Milestone 01 Backend Foundation

## Milestone Overview

This PR establishes the backend foundation for the KAM VOGUE Anajao ecommerce platform. It focuses on infrastructure, architecture, database readiness, documentation, tests, and CI/CD only.

## Implementation Summary

- Added strict TypeScript Express application structure.
- Added modular health/readiness module.
- Added Prisma MariaDB/MySQL baseline migration.
- Added safe environment loading with Zod.
- Added Pino logging, Helmet, CORS, rate limiting, centralized errors, and graceful shutdown.
- Added Swagger docs at `/api-docs`.
- Added Postman collection and project documentation.
- Added CI workflow with MariaDB service.

## Testing Evidence

See `docs/milestones/milestone-01-test-report.md`.

## Database Changes

- Added Prisma schema with MySQL provider.
- Added baseline migration with no business tables.
- No customer, product, order, inventory, or payment tables were created.

## Security Considerations

- Secrets are loaded from environment variables only.
- `.env` files are gitignored.
- Public health/readiness endpoints do not expose sensitive database details.
- CORS defaults are explicit and configurable.
- Rate limiting and Helmet are enabled globally.

## Known Limitations

- Production database limits and MySQL/MariaDB version must be verified with Truehost.
- Local readiness requires XAMPP MariaDB to be running and `.env` to be configured.

## Reviewer Checklist

- [ ] Confirm Milestone 1 scope only.
- [ ] Confirm no business tables were introduced.
- [ ] Confirm health/readiness behavior.
- [ ] Confirm CI checks are required and passing.
- [ ] Confirm docs and Postman collection are importable.

## PR Creation

Local branch is pushed. Open the PR with:

```text
https://github.com/ikhaliddevs/anajao-ecommerce-backend/compare/develop...feature/milestone-01-backend-foundation?expand=1
```

GitHub CLI was unavailable in the local shell (`gh` command not found), so the PR could not be opened automatically from this environment.
