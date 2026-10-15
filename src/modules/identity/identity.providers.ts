import { AppError } from "../../common/errors/app-error.js";
import type { ChallengeKind } from "../../generated/prisma/enums.js";

export interface ChallengeDelivery {
  // Implementations must not log the token; use a verified email/SMS provider.
  send(message: {
    destination: string;
    kind: ChallengeKind;
    token: string;
    expiresAt: Date;
  }): Promise<void>;
}

export const unavailableDelivery: ChallengeDelivery = {
  send: () =>
    Promise.reject(
      new AppError("Verification delivery is not configured", 503, "DELIVERY_UNAVAILABLE")
    )
};

export interface SocialIdentityProvider {
  // Adapter must validate issuer, audience, expiry, signature, nonce and verified
  // email with the provider. Never auto-link by an unverified email claim.
  authenticate(
    provider: "google" | "apple",
    credential: string,
    nonce: string
  ): Promise<{ providerSubject: string; verifiedEmail: string }>;
}
