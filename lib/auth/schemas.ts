import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().trim().min(1).max(80).optional(),
  referralCode: z.string().trim().min(1).max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
});

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});
