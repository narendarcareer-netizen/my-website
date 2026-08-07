import "server-only";
import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import type { NormalizedJob } from "@/types/database-job";
import { extractJobSkills } from "@/lib/matching/extract-job-skills";

interface GreenhouseJob {
  id: number;
  title: string;
  updated_at?: string;
  first_published?: string;
  absolute_url: string;
  location?: { name?: string };
  content?: string;
}

interface GreenhouseResponse { jobs: GreenhouseJob[]; meta?: { total?: number } }

const TEMPORARY_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function decodeContent(content = "") {
  return sanitizeHtml(content.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"), {
    allowedTags: ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "h2", "h3", "h4", "a", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
  });
}

function plainText(html: string) { return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }); }

function inferEmploymentType(text: string) {
  const value = text.toLowerCase();
  if (/\b(contract|contractor|temporary|freelance)\b/.test(value)) return "Contract";
  if (/\bpart[- ]time\b/.test(value)) return "Part-time";
  if (/\bintern(ship)?\b/.test(value)) return "Internship";
  return "Full-time";
}

function inferWorkplaceType(location: string, text: string) {
  const value = `${location} ${text}`.toLowerCase();
  if (value.includes("remote")) return "Remote";
  if (value.includes("hybrid")) return "Hybrid";
  return "On-site";
}

function extractSalary(text: string) {
  const match = text.replace(/,/g, "").match(/\$\s?(\d{2,3})(?:000|k)?\s*(?:-|–|—|to)\s*\$?\s?(\d{2,3})(?:000|k)?/i);
  if (!match) return { salary_min: null, salary_max: null, salary_currency: null };
  const scale = Number(match[1]) < 1000 ? 1000 : 1;
  return { salary_min: Number(match[1]) * scale, salary_max: Number(match[2]) * scale, salary_currency: "USD" };
}

async function fetchWithRetry(url: string, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": "JobPilot/1.0 job-import" }, cache: "no-store" });
      if (!response.ok) {
        if (TEMPORARY_STATUS.has(response.status) && attempt < attempts) { await new Promise(resolve => setTimeout(resolve, 500 * 2 ** (attempt - 1))); continue; }
        throw new Error(`Greenhouse returned HTTP ${response.status}.`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    } finally { clearTimeout(timeout); }
  }
  throw lastError instanceof Error ? lastError : new Error("Greenhouse request failed.");
}

export async function fetchGreenhouseJobs(boardIdentifier: string): Promise<NormalizedJob[]> {
  const board = boardIdentifier.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,100}$/.test(board)) throw new Error("The Greenhouse board identifier is invalid.");
  const response = await fetchWithRetry(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
  const payload = await response.json() as GreenhouseResponse;
  if (!Array.isArray(payload.jobs)) throw new Error("Greenhouse returned an unexpected response.");

  return Promise.all(payload.jobs.map(async job => {
    const description = decodeContent(job.content);
    const text = plainText(description);
    const location = job.location?.name?.trim() || null;
    const salary = extractSalary(text);
    const stableContent = JSON.stringify({ title: job.title.trim(), description, location, url: job.absolute_url, updated: job.updated_at ?? null });
    return {
      external_id: String(job.id), ats_type: "greenhouse" as const, source_url: job.absolute_url, apply_url: job.absolute_url,
      title: job.title.trim(), description, location, workplace_type: inferWorkplaceType(location ?? "", text), employment_type: inferEmploymentType(`${job.title} ${text}`),
      ...salary, posted_at: job.first_published ?? null, source_updated_at: job.updated_at ?? null, status: "active" as const,
      content_hash: createHash("sha256").update(stableContent).digest("hex"),
      skills: extractJobSkills(job.title, description),
    };
  }));
}
