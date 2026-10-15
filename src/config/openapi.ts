export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Anajao Ecommerce Backend API",
    version: "1.0.0",
    description: "Milestone 1 backend foundation endpoints for KAM VOGUE Anajao ecommerce."
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development"
    }
  ],
  paths: {
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
