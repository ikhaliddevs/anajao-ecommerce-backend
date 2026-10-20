import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(15)
  .max(128)
  .refine((value) => !/^(.)\1+$/.test(value), "Password must not repeat a single character");
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const registerSchema = z
  .object({ email: emailSchema, password: passwordSchema, name: z.string().trim().min(1).max(100) })
  .strict();
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
    mfaCode: z
      .string()
      .regex(/^\d{6}$/)
      .optional()
  })
  .strict();
export const refreshSchema = z.object({ refreshToken: tokenSchema }).strict();
export const emailRequestSchema = z.object({ email: emailSchema }).strict();
export const challengeSchema = z.object({ token: tokenSchema }).strict();
export const resetSchema = challengeSchema.extend({ password: passwordSchema }).strict();
export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    phone: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/)
      .nullable()
      .optional()
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide a profile field");
export const addressSchema = z
  .object({
    label: z.string().trim().min(1).max(50),
    recipient: z.string().trim().min(1).max(100),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(100),
    region: z.string().trim().min(1).max(100),
    postalCode: z.string().trim().min(1).max(20).optional(),
    country: z.string().regex(/^[A-Z]{2}$/)
  })
  .strict();
export const mfaSchema = z.object({ code: z.string().regex(/^\d{6}$/) }).strict();
export const mfaSetupSchema = z.object({ password: z.string().min(1).max(128) }).strict();
export const privacySchema = z.object({ kind: z.enum(["EXPORT", "DELETE"]) }).strict();
export const addressParamsSchema = z.object({ id: z.uuid() });
