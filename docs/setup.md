# Local Backend Setup

## Runtime

Use Node.js 24 LTS for local development and CI parity. The local machine used for this scaffold had Node.js 26.3.1 installed, which is a Current release, not the Active LTS line as of October 13, 2026.

## XAMPP MariaDB

1. Open the XAMPP Control Panel.
2. Start the MariaDB/MySQL service.
3. Open phpMyAdmin or the XAMPP shell.
4. Create the development database and least-privilege user:

```sql
CREATE DATABASE IF NOT EXISTS anajao_ecommerce_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'anajao_dev'@'localhost' IDENTIFIED BY 'change-me';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES
ON anajao_ecommerce_dev.* TO 'anajao_dev'@'localhost';
FLUSH PRIVILEGES;
```

5. Copy `.env.example` to `.env` and update `DATABASE_URL` with the local password. Prisma 7 reads migration connection settings from `prisma7.config.ts`, and the application parses the same `DATABASE_URL` for the MariaDB driver adapter.
6. Run:

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run dev
```

## Database Reset

For local development only:

```bash
npm run db:reset
```

This drops and recreates the schema managed by Prisma migrations. Do not run reset commands against shared or production databases.

## API Documentation

Milestone 2 also requires `AUTH_SECRET` and `MFA_ENCRYPTION_KEY`; see [identity setup and provider boundaries](identity-access.md). The example values must be replaced before startup. Integration tests now use a dedicated `TEST_DATABASE_URL` ending in `_test`, never the development database.

After starting the server, open:

```text
http://localhost:3000/api-docs
```
