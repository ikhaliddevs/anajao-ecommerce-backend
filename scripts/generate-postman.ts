import { mkdirSync, writeFileSync } from "node:fs";
import { identityOperations } from "../src/modules/identity/identity.openapi.js";
import { openApiDocument } from "../src/config/openapi.js";

const samples: Record<string, Record<string, unknown>> = {
  RegisterRequest: { email: "{{email}}", name: "Example Customer", password: "{{password}}" },
  LoginRequest: { email: "{{email}}", password: "{{password}}" },
  RefreshRequest: { refreshToken: "{{refreshToken}}" },
  EmailRequest: { email: "{{email}}" },
  ChallengeRequest: { token: "{{challengeToken}}" },
  ResetRequest: { token: "{{challengeToken}}", password: "{{newPassword}}" },
  ProfileRequest: { name: "Updated Customer", phone: "+2348012345678" },
  AddressRequest: {
    label: "Home",
    recipient: "Example Customer",
    line1: "1 Example Street",
    city: "Lagos",
    region: "Lagos",
    country: "NG"
  },
  MfaSetupRequest: { password: "{{password}}" },
  MfaRequest: { code: "{{mfaCode}}" },
  PrivacyRequestBody: { kind: "EXPORT" }
};
const account = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "customer@example.com",
  name: "Example Customer",
  phone: null,
  role: "CUSTOMER",
  status: "ACTIVE",
  emailVerifiedAt: "2026-10-15T10:00:00.000Z",
  phoneVerifiedAt: null
};
const responses: Record<string, unknown> = {
  Message: { message: "Request completed" },
  Tokens: {
    accessToken: "example-access-token-not-valid",
    refreshToken: "example-refresh-token-not-valid",
    tokenType: "Bearer",
    expiresIn: 600
  },
  Account: account,
  Address: {
    id: "00000000-0000-4000-8000-000000000002",
    userId: account.id,
    label: "Home",
    recipient: "Example Customer",
    line1: "1 Example Street",
    line2: null,
    city: "Lagos",
    region: "Lagos",
    postalCode: null,
    country: "NG",
    createdAt: "2026-10-15T10:00:00.000Z"
  },
  AddressList: [],
  MfaEnrollment: {
    secret: "EXAMPLE-NOT-A-REAL-SECRET",
    uri: "otpauth://totp/Anajao:Administrator?secret=EXAMPLE"
  },
  PrivacyRequest: {
    id: "00000000-0000-4000-8000-000000000003",
    userId: account.id,
    kind: "EXPORT",
    status: "PENDING",
    createdAt: "2026-10-15T10:00:00.000Z"
  },
  AccessCheck: { authorized: true },
  Error: {
    code: "PROVIDER_UNAVAILABLE",
    message: "Social login requires a verified provider integration"
  }
};
const items = identityOperations.map((operation) => {
  const path = operation.path.replace("{id}", "{{addressId}}").replace("{provider}", "google");
  const request = {
    method: operation.method.toUpperCase(),
    header: [
      { key: "Content-Type", value: "application/json" },
      ...(operation.protected ? [{ key: "Authorization", value: "Bearer {{accessToken}}" }] : [])
    ],
    url: {
      raw: `{{baseUrl}}/api/v1${path}`,
      host: ["{{baseUrl}}"],
      path: ["api", "v1", ...path.slice(1).split("/")]
    },
    description: operation.summary,
    ...(operation.body
      ? {
          body: {
            mode: "raw",
            raw: JSON.stringify(samples[operation.body], null, 2),
            options: { raw: { language: "json" } }
          }
        }
      : {})
  };
  const success = operation.status < 400;
  const result = success
    ? { success: true, data: responses[operation.response] }
    : { success: false, error: responses.Error };
  const exec = [
    `pm.test('Expected status', () => pm.response.to.have.status(${operation.status}));`,
    "const body = pm.response.json();",
    `pm.test('Response envelope', () => pm.expect(body.success).to.eql(${success}));`,
    "pm.test('No credential fields', () => pm.expect(pm.response.text()).not.to.match(/passwordHash|tokenHash|encryptedSecret/));"
  ];
  if (operation.response === "Tokens")
    exec.push(
      "pm.test('Token pair', () => { pm.expect(body.data.accessToken).to.be.a('string'); pm.expect(body.data.refreshToken).to.match(/^[A-Za-z0-9_-]{43}$/); });",
      "pm.environment.set('accessToken', body.data.accessToken); pm.environment.set('refreshToken', body.data.refreshToken);"
    );
  if (operation.response === "Address") exec.push("pm.environment.set('addressId', body.data.id);");
  return {
    name: `${request.method} ${operation.path}`,
    request,
    event: [{ listen: "test", script: { type: "text/javascript", exec } }],
    response: [
      {
        name: "Illustrative response (not an execution record)",
        originalRequest: request,
        status:
          operation.status === 202
            ? "Accepted"
            : operation.status === 201
              ? "Created"
              : operation.status === 503
                ? "Service Unavailable"
                : "OK",
        code: operation.status,
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "no-store" }
        ],
        body: JSON.stringify(result, null, 2)
      },
      {
        name: "Illustrative validation/auth error",
        originalRequest: request,
        status: "Bad Request",
        code: 400,
        header: [{ key: "Content-Type", value: "application/json" }],
        body: JSON.stringify(
          {
            success: false,
            error: { code: "VALIDATION_ERROR", message: "Request validation failed" }
          },
          null,
          2
        )
      }
    ]
  };
});
const negatives = [
  { name: "Unauthenticated profile", method: "GET", path: "/me", code: 401 },
  {
    name: "Customer denied admin access (use customer token)",
    method: "GET",
    path: "/admin/access-check",
    code: 403,
    auth: true
  },
  {
    name: "Invalid registration",
    method: "POST",
    path: "/auth/register",
    code: 400,
    body: { email: "invalid", password: "short" }
  },
  {
    name: "Invalid login",
    method: "POST",
    path: "/auth/login",
    code: 401,
    body: { email: "absent@example.com", password: "wrong" }
  }
].map((item) => ({
  name: item.name,
  request: {
    method: item.method,
    url: {
      raw: `{{baseUrl}}/api/v1${item.path}`,
      host: ["{{baseUrl}}"],
      path: ["api", "v1", ...item.path.slice(1).split("/")]
    },
    header: [
      { key: "Content-Type", value: "application/json" },
      ...(item.auth ? [{ key: "Authorization", value: "Bearer {{accessToken}}" }] : [])
    ],
    ...(item.body
      ? {
          body: {
            mode: "raw",
            raw: JSON.stringify(item.body),
            options: { raw: { language: "json" } }
          }
        }
      : {})
  },
  event: [
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          `pm.test('Expected denial', () => pm.response.to.have.status(${item.code}));`,
          "pm.test('Safe error envelope', () => pm.expect(pm.response.json().success).to.eql(false));"
        ]
      }
    }
  ]
}));
mkdirSync("postman", { recursive: true });
writeFileSync(
  "postman/anajao-milestone-02.postman_collection.json",
  JSON.stringify(
    {
      info: {
        name: "Anajao Milestone 2 — Identity and Access",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        description:
          "Select requests using docs/identity-access.md walkthrough. Delivery and administrator fixtures require setup; this is not a sequential run-all collection. Responses are illustrative."
      },
      item: [
        { name: "Identity and account", item: items },
        { name: "Negative examples", item: negatives }
      ]
    },
    null,
    2
  ) + "\n"
);
writeFileSync(
  "postman/anajao-milestone-02.postman_environment.json",
  JSON.stringify(
    {
      name: "Anajao local identity examples",
      values: [
        { key: "baseUrl", value: "http://localhost:3000", enabled: true },
        { key: "email", value: "customer@example.com", enabled: true },
        ...[
          "password",
          "newPassword",
          "accessToken",
          "refreshToken",
          "challengeToken",
          "mfaCode",
          "addressId"
        ].map((key) => ({ key, value: "", type: "secret", enabled: true }))
      ],
      _postman_variable_scope: "environment"
    },
    null,
    2
  ) + "\n"
);
writeFileSync("docs/openapi.json", JSON.stringify(openApiDocument, null, 2) + "\n");
console.log(
  `Generated ${items.length + negatives.length} Postman requests, environment and OpenAPI snapshot`
);
