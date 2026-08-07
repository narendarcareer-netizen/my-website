import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || null);
const optionalUrl = z.string().trim().max(500).optional().refine(value => !value || /^https:\/\//i.test(value), "Use a complete https:// URL.").transform(value => value || null);

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name.").max(100),
  phone: optionalText(30),
  location: optionalText(120),
  linkedin_url: optionalUrl,
  portfolio_url: optionalUrl,
  years_experience: z.coerce.number().int().min(0).max(70),
});

export const jobPreferencesSchema = z.object({
  preferred_titles: z.string().max(500).transform(value => value.split(",").map(item => item.trim()).filter(Boolean).slice(0, 20)),
  preferred_locations: z.string().max(500).transform(value => value.split(",").map(item => item.trim()).filter(Boolean).slice(0, 20)),
  remote_preference: z.enum(["On-site", "Hybrid", "Remote", "Flexible"]),
  employment_types: z.string().max(300).transform(value => value.split(",").map(item => item.trim()).filter(Boolean).slice(0, 10)),
  minimum_salary: z.coerce.number().int().min(0).max(10000000),
  salary_currency: z.string().trim().length(3).transform(value => value.toUpperCase()),
  industries: z.string().max(500).transform(value => value.split(",").map(item => item.trim()).filter(Boolean).slice(0, 20)),
});

export const workAuthorizationSchema = z.object({
  country: z.string().trim().min(2).max(100),
  authorization_type: z.string().trim().min(2).max(120),
  requires_sponsorship: z.enum(["true", "false"]).transform(value => value === "true"),
});

export const resumeMetadataSchema = z.object({
  fileName: z.string().trim().min(1).max(255).refine(name => /\.(pdf|docx)$/i.test(name), "Only PDF and DOCX files are supported."),
  size: z.number().int().positive().max(5 * 1024 * 1024, "The file must be 5 MB or smaller."),
  type: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
});
