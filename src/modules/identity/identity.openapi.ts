import { z } from "zod";
import * as requests from "./identity.validation.js";

export type IdentityOperation = {
  method: "get" | "post" | "patch" | "delete";
  path: string;
  summary: string;
  body?: string;
  response: string;
  status: number;
  protected?: boolean;
};
export const identityOperations: IdentityOperation[] = [
  {
    method: "post",
    path: "/auth/register",
    summary:
      "Register a pending customer; same response for duplicate email. Use resend-verification to request delivery.",
    body: "RegisterRequest",
    response: "Message",
    status: 202
  },
  {
    method: "post",
    path: "/auth/login",
    summary:
      "Sign in with verified email and password; enrolled administrators must supply a fresh TOTP code",
    body: "LoginRequest",
    response: "Tokens",
    status: 200
  },
  {
    method: "post",
    path: "/auth/refresh",
    summary:
      "Rotate refresh token; reusing an old token revokes its entire family, including concurrent refreshes",
    body: "RefreshRequest",
    response: "Tokens",
    status: 200
  },
  {
    method: "post",
    path: "/auth/logout",
    summary: "Idempotently revoke the supplied refresh token family",
    body: "RefreshRequest",
    response: "Message",
    status: 200
  },
  {
    method: "post",
    path: "/auth/logout-all",
    summary: "Revoke every session, including this access token",
    response: "Message",
    status: 200,
    protected: true
  },
  {
    method: "get",
    path: "/auth/me",
    summary: "Current account (alias for GET /me)",
    response: "Account",
    status: 200,
    protected: true
  },
  {
    method: "post",
    path: "/auth/password/forgot",
    summary: "Request password recovery; generic response even if delivery is unavailable",
    body: "EmailRequest",
    response: "Message",
    status: 202
  },
  {
    method: "post",
    path: "/auth/password/reset",
    summary: "Consume a single-use reset token and revoke all sessions",
    body: "ResetRequest",
    response: "Message",
    status: 200
  },
  {
    method: "post",
    path: "/auth/email/verify",
    summary: "Consume an email verification token and activate the account",
    body: "ChallengeRequest",
    response: "Message",
    status: 200
  },
  {
    method: "post",
    path: "/auth/email/resend-verification",
    summary: "Request verification; requires configured delivery adapter; generic response",
    body: "EmailRequest",
    response: "Message",
    status: 202
  },
  {
    method: "post",
    path: "/auth/phone/request-verification",
    summary: "Request a token delivered to the current profile phone via an SMS adapter",
    response: "Message",
    status: 202,
    protected: true
  },
  {
    method: "post",
    path: "/auth/phone/verify",
    summary: "Consume a single-use phone verification token",
    body: "ChallengeRequest",
    response: "Message",
    status: 200
  },
  {
    method: "post",
    path: "/auth/mfa/setup",
    summary:
      "Administrator only: reauthenticate with password and enroll TOTP. Store the returned secret securely.",
    body: "MfaSetupRequest",
    response: "MfaEnrollment",
    status: 200,
    protected: true
  },
  {
    method: "post",
    path: "/auth/mfa/confirm",
    summary:
      "Administrator only: confirm TOTP and revoke all sessions; sign in again using a fresh code",
    body: "MfaRequest",
    response: "Message",
    status: 200,
    protected: true
  },
  {
    method: "post",
    path: "/auth/social/{provider}",
    summary:
      "Reserved Google/Apple boundary; unavailable until a verified integration is implemented",
    response: "Error",
    status: 503
  },
  {
    method: "get",
    path: "/me",
    summary: "Get current account without credential fields",
    response: "Account",
    status: 200,
    protected: true
  },
  {
    method: "patch",
    path: "/me",
    summary: "Update name or phone; changing phone clears its verification",
    body: "ProfileRequest",
    response: "Account",
    status: 200,
    protected: true
  },
  {
    method: "get",
    path: "/me/addresses",
    summary: "List owned addresses (maximum 100 per account, newest first)",
    response: "AddressList",
    status: 200,
    protected: true
  },
  {
    method: "post",
    path: "/me/addresses",
    summary: "Create an owned address (maximum 100)",
    body: "AddressRequest",
    response: "Address",
    status: 201,
    protected: true
  },
  {
    method: "delete",
    path: "/me/addresses/{id}",
    summary: "Delete an owned address; unknown or other-account IDs return 404",
    response: "Message",
    status: 200,
    protected: true
  },
  {
    method: "post",
    path: "/me/privacy-requests",
    summary:
      "Request export or deletion; DELETE disables account and revokes sessions pending manual fulfillment",
    body: "PrivacyRequestBody",
    response: "PrivacyRequest",
    status: 202,
    protected: true
  },
  {
    method: "get",
    path: "/admin/access-check",
    summary: "Requires current ADMIN role, confirmed MFA factor, and MFA-authenticated session",
    response: "AccessCheck",
    status: 200,
    protected: true
  }
];

const requestSchemas = {
  RegisterRequest: requests.registerSchema,
  LoginRequest: requests.loginSchema,
  RefreshRequest: requests.refreshSchema,
  EmailRequest: requests.emailRequestSchema,
  ChallengeRequest: requests.challengeSchema,
  ResetRequest: requests.resetSchema,
  ProfileRequest: requests.profileSchema,
  AddressRequest: requests.addressSchema,
  MfaRequest: requests.mfaSchema,
  MfaSetupRequest: requests.mfaSetupSchema,
  PrivacyRequestBody: requests.privacySchema
};
const text = { type: "string" };
const timestamp = { type: ["string", "null"], format: "date-time" };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false
});
const address = object({
  id: { type: "string", format: "uuid" },
  userId: { type: "string", format: "uuid" },
  label: text,
  recipient: text,
  line1: text,
  line2: { type: ["string", "null"] },
  city: text,
  region: text,
  country: { type: "string", pattern: "^[A-Z]{2}$" },
  postalCode: { type: ["string", "null"] },
  createdAt: { type: "string", format: "date-time" }
});
export const identitySchemas = {
  ...Object.fromEntries(
    Object.entries(requestSchemas).map(([name, schema]) => {
      const json = z.toJSONSchema(schema);
      delete json.$schema;
      return [name, json];
    })
  ),
  Message: object({ message: text }),
  Tokens: object({
    accessToken: text,
    refreshToken: { type: "string", pattern: "^[A-Za-z0-9_-]{43}$" },
    tokenType: { const: "Bearer" },
    expiresIn: { type: "integer", minimum: 60, maximum: 900 }
  }),
  Account: object({
    id: { type: "string", format: "uuid" },
    email: { type: "string", format: "email" },
    name: text,
    phone: { type: ["string", "null"] },
    role: { enum: ["CUSTOMER", "ADMIN", "SELLER"] },
    status: { enum: ["PENDING_VERIFICATION", "ACTIVE", "DISABLED", "LOCKED"] },
    emailVerifiedAt: timestamp,
    phoneVerifiedAt: timestamp
  }),
  Address: address,
  AddressList: { type: "array", items: ref("Address"), maxItems: 100 },
  MfaEnrollment: object({ secret: text, uri: text }),
  PrivacyRequest: object({
    id: { type: "string", format: "uuid" },
    userId: { type: "string", format: "uuid" },
    kind: { enum: ["EXPORT", "DELETE"] },
    status: { const: "PENDING" },
    createdAt: { type: "string", format: "date-time" }
  }),
  AccessCheck: object({ authorized: { const: true } }),
  Error: object({
    success: { const: false },
    error: object(
      {
        code: text,
        message: text,
        details: { type: "array", items: object({ path: text, message: text }) }
      },
      ["code", "message"]
    )
  })
};

export const identityPaths: Record<string, Record<string, unknown>> = {};
for (const operation of identityOperations) {
  const responses: Record<string, unknown> = {};
  for (const [status, description] of Object.entries({
    400: "Invalid request",
    401: "Authentication failed or token invalid/expired/reused",
    403: "Role or MFA denied",
    404: "Owned resource not found",
    409: "Resource limit or MFA already configured",
    429: "Rate limit exceeded",
    500: "Internal error",
    503: "Provider unavailable"
  }))
    responses[status] = { description, content: { "application/json": { schema: ref("Error") } } };
  responses[operation.status] = {
    description: operation.status === 503 ? "Integration unavailable" : "Success",
    content: {
      "application/json": {
        schema:
          operation.response === "Error"
            ? ref("Error")
            : object({ success: { const: true }, data: ref(operation.response) })
      }
    }
  };
  const parameters = operation.path.includes("{id}")
    ? [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }]
    : operation.path.includes("{provider}")
      ? [{ name: "provider", in: "path", required: true, schema: { enum: ["google", "apple"] } }]
      : undefined;
  const path = `/api/v1${operation.path}`;
  identityPaths[path] ??= {};
  identityPaths[path][operation.method] = {
    operationId: `${operation.method}_${operation.path.replace(/[^a-zA-Z0-9]/g, "_")}`,
    summary: operation.summary,
    tags: [operation.path.startsWith("/me") ? "Account" : "Identity"],
    security: operation.protected ? [{ bearerAuth: [] }] : [],
    ...(parameters ? { parameters } : {}),
    ...(operation.body
      ? {
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref(operation.body) } }
          }
        }
      : {}),
    responses
  };
}
