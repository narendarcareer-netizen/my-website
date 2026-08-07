import { z } from "zod";

export const jobSourceSchema = z.object({
  companyName: z.string().trim().min(1, "Enter a company name.").max(160),
  boardIdentifier: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{2,100}$/, "Use the token from the Greenhouse board URL."),
  careersUrl: z.string().trim().url("Enter a valid careers URL.").refine(value => value.startsWith("https://"), "The careers URL must use https://."),
  websiteUrl: z.string().trim().optional().refine(value => !value || /^https:\/\//.test(value), "The website URL must use https://."),
});

export const importSourceSchema = z.object({ companyId: z.string().uuid(), boardIdentifier: z.string().regex(/^[a-z0-9_-]{2,100}$/) });
