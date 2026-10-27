import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import nodemailer from "nodemailer";
import { createEmailDelivery } from "../src/modules/identity/gmail-delivery.js";
import { loadEnv } from "../src/config/env.js";
import { testEnv } from "./helpers.js";

vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn() } }));
const sendMail =
  vi.fn<(mail: { text: string }) => Promise<{ accepted: string[]; rejected: string[] }>>();
const close = vi.fn();
const env = { ...testEnv, gmail: { user: "sender@gmail.com", appPassword: "abcdefghijklmnop" } };
const message = {
  destination: "customer@example.com",
  kind: "EMAIL_VERIFICATION" as const,
  token: "example-token",
  expiresAt: new Date("2030-01-01T00:00:00Z")
};

beforeEach(() => {
  sendMail.mockReset().mockResolvedValue({ accepted: [message.destination], rejected: [] });
  vi.mocked(nodemailer.createTransport).mockReturnValue({
    sendMail,
    close
  } as unknown as ReturnType<typeof nodemailer.createTransport>);
});
afterEach(() => vi.useRealTimers());

describe("Gmail delivery", () => {
  it("requires credentials only when Gmail is enabled and normalizes app-password spaces", () => {
    expect(loadEnv({ NODE_ENV: "test" }).gmail).toBeUndefined();
    expect(() => loadEnv({ NODE_ENV: "test", EMAIL_PROVIDER: "gmail" })).toThrow();
    expect(
      loadEnv({
        NODE_ENV: "test",
        EMAIL_PROVIDER: "gmail",
        GMAIL_USER: env.gmail.user,
        GMAIL_APP_PASSWORD: "abcd efgh ijkl mnop"
      }).gmail
    ).toEqual(env.gmail);
    expect(() =>
      loadEnv({
        NODE_ENV: "test",
        EMAIL_PROVIDER: "gmail",
        GMAIL_USER: env.gmail.user,
        GMAIL_APP_PASSWORD: "short"
      })
    ).toThrow();
  });

  it.each(["EMAIL_VERIFICATION", "PASSWORD_RESET"] as const)(
    "delivers %s with TLS and token expiry",
    async (kind) => {
      await createEmailDelivery(env).send({ ...message, kind });
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          logger: false,
          debug: false
        })
      );
      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { name: "KAM VOGUE", address: env.gmail.user },
          to: { address: message.destination, name: "" },
          subject:
            kind === "EMAIL_VERIFICATION"
              ? "Verify your KAM VOGUE email"
              : "Reset your KAM VOGUE password"
        })
      );
      expect(sendMail.mock.calls[0]?.[0].text).toContain(message.token);
      expect(sendMail.mock.calls[0]?.[0].text).toContain(message.expiresAt.toISOString());
      expect(close).toHaveBeenCalled();
    }
  );

  it("does not attempt SMTP for disabled delivery or phone verification", async () => {
    await expect(createEmailDelivery(testEnv).send(message)).rejects.toMatchObject({
      code: "DELIVERY_UNAVAILABLE"
    });
    await expect(
      createEmailDelivery(env).send({ ...message, kind: "PHONE_VERIFICATION" })
    ).rejects.toMatchObject({ code: "DELIVERY_UNAVAILABLE" });
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });

  it("sanitizes provider failures and rejects recipient refusal", async () => {
    sendMail.mockRejectedValueOnce(new Error("sensitive SMTP details"));
    await expect(createEmailDelivery(env).send(message)).rejects.toMatchObject({
      code: "DELIVERY_UNAVAILABLE",
      message: "Email delivery unavailable"
    });
    sendMail.mockResolvedValueOnce({ accepted: [], rejected: [message.destination] });
    await expect(createEmailDelivery(env).send(message)).rejects.toMatchObject({
      code: "DELIVERY_UNAVAILABLE"
    });
  });

  it("bounds delivery to six seconds within the account transaction", async () => {
    vi.useFakeTimers();
    sendMail.mockImplementationOnce(() => new Promise(() => {}));
    const result = expect(createEmailDelivery(env).send(message)).rejects.toMatchObject({
      code: "DELIVERY_UNAVAILABLE"
    });
    await vi.advanceTimersByTimeAsync(6000);
    await result;
    expect(close).toHaveBeenCalled();
  });
});
