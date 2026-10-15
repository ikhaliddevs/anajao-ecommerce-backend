import { identityPaths, identitySchemas } from "../modules/identity/identity.openapi.js";
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Anajao Ecommerce Backend API",
    version: "2.0.0",
    description:
      "Identity and account foundation. Bearer access tokens; no authentication cookies. Verification and recovery delivery require an injected provider. SELLER is the vendor-ready role."
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development"
    }
  ],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: identitySchemas
  },
  paths: {
    ...identityPaths,
    "/api/v1/health": {
      get: {
        summary: "Application health",
        tags: ["Health"],
        responses: {
          "200": {
            description: "Application process is running"
          }
        }
      }
    },
    "/api/v1/ready": {
      get: {
        summary: "Application readiness",
        tags: ["Health"],
        responses: {
          "200": {
            description: "Application and database are ready"
          },
          "503": {
            description: "Application dependency is unavailable"
          }
        }
      }
    }
  }
};
