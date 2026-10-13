import type { DatabaseClient } from "../../database/client.js";

type HealthPayload = {
  status: "ok";
  uptimeSeconds: number;
  timestamp: string;
};

type ReadinessPayload = {
  ready: boolean;
  services: {
    application: "ready";
    database: "ready" | "unavailable";
  };
  timestamp: string;
};

export class HealthService {
  constructor(private readonly database: DatabaseClient) {}

  getHealth(): HealthPayload {
    return {
      status: "ok",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    };
  }

  async getReadiness(): Promise<ReadinessPayload> {
    const databaseReady = await this.database.isReady();

    return {
      ready: databaseReady,
      services: {
        application: "ready",
        database: databaseReady ? "ready" : "unavailable"
      },
      timestamp: new Date().toISOString()
    };
  }
}
