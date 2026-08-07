export type JobStatus = "active" | "closed";

export interface CompanyRecord {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;
  careers_url: string | null;
  ats_type: "greenhouse";
  ats_identifier: string;
  active: boolean;
}

export interface DatabaseJob {
  id: string;
  external_id: string;
  source_url: string;
  apply_url: string;
  title: string;
  description: string;
  location: string | null;
  workplace_type: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  posted_at: string | null;
  updated_at: string;
  status: JobStatus;
  companies: CompanyRecord;
  job_skills?: { skill: string }[];
  job_matches?: { overall_score: number; reasons: { strong: string[]; gaps: string[]; unknown: string[] } }[];
}

export interface NormalizedJob {
  external_id: string;
  ats_type: "greenhouse";
  source_url: string;
  apply_url: string;
  title: string;
  description: string;
  location: string | null;
  workplace_type: string | null;
  employment_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  posted_at: string | null;
  source_updated_at: string | null;
  status: "active";
  content_hash: string;
  skills: string[];
}

export interface ImportResult {
  imported: number;
  updated: number;
  unchanged: number;
  closed: number;
  failed: number;
  errors: string[];
}
