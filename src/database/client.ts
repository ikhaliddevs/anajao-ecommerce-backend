import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import type { Logger } from "../common/types/logger.js";
import { PrismaClient } from "../generated/prisma/client.js";

export type DatabaseClient = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isReady: () => Promise<boolean>;
};

export class PrismaDatabaseClient implements DatabaseClient {
  readonly prisma: PrismaClient;

  constructor(
    private readonly logger: Logger,
    databaseUrl = process.env.DATABASE_URL
  ) {
    const adapter = new PrismaMariaDb(parseMariaDbConnection(databaseUrl));
    this.prisma = new PrismaClient({ adapter });
  }

  async connect(): Promise<void> {
    await this.prisma.$connect();
    await this.prisma.$queryRaw`SELECT 1`;
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  async isReady(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      this.logger.error({}, "Database readiness check failed");
      return false;
    }
  }
}

const parseMariaDbConnection = (databaseUrl: string | undefined) => {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to initialize the database client");
  }

  const parsed = new URL(databaseUrl);
  const database = parsed.pathname.replace(/^\//, "");
  const connectionLimit = Number(parsed.searchParams.get("connection_limit") ?? 10);

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    connectionLimit
  };
};
