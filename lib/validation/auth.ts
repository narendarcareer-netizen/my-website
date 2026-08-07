import { z } from "zod";

export const emailSchema = z.string().trim().email("Enter a valid email address.").max(254);

export const passwordSchema = z.string().min(8, "Password must contain at least 8 characters.").max(72, "Password is too long.");

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") });

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(100),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({ password: passwordSchema, confirmPassword: z.string() }).refine(data => data.password === data.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });
