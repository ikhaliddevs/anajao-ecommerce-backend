# ANAJAO ECOMMERCE — BACKEND MILESTONE 2

## Role

Act as a Principal Backend Engineer, Software Architect, Database Engineer, and Security Engineer.

## Project

KAM VOGUE — Anajao Ecommerce Platform

## Milestone

02 — Authentication, Authorization, Customer Accounts, and Security Foundation

## Important Boundary

Implement backend authentication and customer account foundations only. Do not implement product catalog, cart, orders, payments, vendor marketplace, frontend features, or mobile features in this milestone.

## Starting Point

Continue from Milestone 1:

- TypeScript strict mode
- Express.js modular architecture
- Prisma with MariaDB/MySQL
- Zod validation
- Pino logging
- Centralized error handling
- Swagger/OpenAPI documentation
- Vitest/Supertest tests
- GitHub Actions CI

## Required Scope

1. Design and implement user/customer authentication models.
2. Add database migrations for accounts, roles, refresh tokens, password reset tokens, and email verification tokens as appropriate.
3. Implement secure password hashing using a proven library such as argon2 or bcrypt.
4. Implement registration, login, refresh-token rotation, logout, email verification preparation, and password reset preparation.
5. Implement role-based authorization middleware with customer/admin/vendor-ready role boundaries.
6. Add account status handling for active, pending verification, disabled, and locked accounts.
7. Add Zod validation schemas for all auth requests.
8. Add OpenAPI documentation for all auth endpoints.
9. Add tests covering success, validation failures, duplicate registration, invalid credentials, refresh-token rotation, logout, protected routes, role denial, and environment errors.
10. Update Postman collection with auth requests and test assertions.
11. Update AGENTS.md and milestone reports.

## Security Requirements

- Never log passwords, password hashes, tokens, or reset secrets.
- Store only hashed refresh tokens and reset tokens.
- Use short-lived access tokens and rotating refresh tokens.
- Use strong password policy validation.
- Add brute-force-aware login rate limiting.
- Make auth error messages safe and non-enumerating where appropriate.
- Keep secrets in environment variables only.

## Suggested API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/logout-all`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/password/forgot`
- `POST /api/v1/auth/password/reset`
- `POST /api/v1/auth/email/verify`
- `POST /api/v1/auth/email/resend-verification`

## Definition Of Done

- Migrations execute successfully against MariaDB.
- Auth endpoints work and are documented.
- Passwords and tokens are handled securely.
- Unit and integration tests pass.
- CI passes.
- Postman collection is updated.
- Milestone 2 summary and test report are generated.
- Pull request is opened against `develop`.
