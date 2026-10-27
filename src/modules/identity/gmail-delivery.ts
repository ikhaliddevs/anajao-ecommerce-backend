import nodemailer from "nodemailer";
import type { AppEnv } from "../../config/env.js";
import { AppError } from "../../common/errors/app-error.js";
import { unavailableDelivery, type ChallengeDelivery } from "./identity.providers.js";

const unavailable = () => new AppError("Email delivery unavailable", 503, "DELIVERY_UNAVAILABLE");

export const createEmailDelivery = (env: AppEnv): ChallengeDelivery => {
  const gmail = env.gmail;
  if (!gmail) return unavailableDelivery;

  return {
    async send(message) {
      if (message.kind === "PHONE_VERIFICATION") throw unavailable();
      // Each send has independent timeouts; the deadline bounds transaction waiting.
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: gmail.user, pass: gmail.appPassword },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
        dnsTimeout: 4000,
        logger: false,
        debug: false,
        disableFileAccess: true,
        disableUrlAccess: true
      });
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const verification = message.kind === "EMAIL_VERIFICATION";
        const result = await Promise.race([
          transport.sendMail({
            from: { name: "KAM VOGUE", address: gmail.user },
            to: { address: message.destination, name: "" },
            subject: verification ? "Verify your KAM VOGUE email" : "Reset your KAM VOGUE password",
            text: [
              verification
                ? "Use this token to verify your email:"
                : "Use this token to reset your password:",
              "",
              message.token,
              "",
              `Expires at ${message.expiresAt.toISOString()}. This token can only be used once.`,
              "If you did not request this, you can ignore this email."
            ].join("\n")
          }),
          new Promise<never>((_, reject) => {
            deadline = setTimeout(() => {
              transport.close();
              reject(unavailable());
            }, 6000);
          })
        ]);
        if (result.accepted.length !== 1 || result.rejected.length) throw unavailable();
      } catch {
        // SMTP errors may contain addresses or credentials. Never propagate them.
        throw unavailable();
      } finally {
        clearTimeout(deadline);
        transport.close();
      }
    }
  };
};
