export interface MatchReasons { strong: string[]; gaps: string[]; unknown: string[] }

export interface MatchUser {
  skills: string[];
  preferredTitles: string[];
  preferredLocations: string[];
  remotePreference: string | null;
  employmentTypes: string[];
  minimumSalary: number | null;
  salaryCurrency: string | null;
  workAuthorizations: { country: string; authorizationType: string; requiresSponsorship: boolean }[];
}

export interface MatchJob {
  id: string;
  title: string;
  description: string;
  location: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[];
}

export interface JobMatchResult {
  job_id: string;
  overall_score: number;
  skills_score: number;
  title_score: number;
  location_score: number;
  employment_type_score: number;
  salary_score: number;
  authorization_score: number;
  matched_skills: string[];
  missing_skills: string[];
  reasons: MatchReasons;
}

export interface MatchCalculationSummary { jobsEvaluated: number; matchesCreated: number; matchesUpdated: number; failures: number; errors: string[] }
