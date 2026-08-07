import { normalizeSkill, normalizeSkills, skillDisplayName } from "./normalize-skill";
import type { JobMatchResult, MatchJob, MatchReasons, MatchUser } from "./types";

const seniority = ["intern", "junior", "associate", "mid", "senior", "staff", "principal", "lead", "manager", "director", "vp"];
const ignoredTitleWords = new Set(["a", "an", "and", "the", "of", "for", "to", "in", "at", "remote", "hybrid"]);
function titleParts(value: string) { return value.toLowerCase().replace(/[^a-z0-9+# ]/g, " ").split(/\s+/).filter(word => word && !ignoredTitleWords.has(word)); }
function seniorityIndex(value: string) { const words = titleParts(value); return seniority.findIndex(level => words.includes(level)); }

function scoreSkills(user: MatchUser, job: MatchJob, reasons: MatchReasons) {
  const userSkills = new Set(normalizeSkills(user.skills));
  const jobSkills = normalizeSkills(job.skills);
  if (!jobSkills.length) { reasons.unknown.push("The job does not list enough skill information to compare."); return { score: 25, matched: [], missing: [] }; }
  const matched = jobSkills.filter(skill => userSkills.has(skill));
  const missing = jobSkills.filter(skill => !userSkills.has(skill));
  const score = Math.round(35 * matched.length / jobSkills.length);
  if (matched.length) reasons.strong.push(`${matched.slice(0, 3).map(skillDisplayName).join(", ")} match your skills.`);
  if (missing.length) reasons.gaps.push(`${missing.slice(0, 3).map(skillDisplayName).join(", ")} ${missing.length === 1 ? "is" : "are"} listed but not in your skills.`);
  return { score, matched, missing };
}

function scoreTitle(user: MatchUser, job: MatchJob, reasons: MatchReasons) {
  if (!user.preferredTitles.length) { reasons.unknown.push("You have not added preferred job titles."); return 14; }
  const jobWords = new Set(titleParts(job.title));
  let best = 0; let bestTitle = "";
  for (const title of user.preferredTitles) {
    const preferredWords = new Set(titleParts(title));
    const overlap = [...jobWords].filter(word => preferredWords.has(word)).length;
    let score = 20 * overlap / Math.max(jobWords.size, preferredWords.size, 1);
    const jobLevel = seniorityIndex(job.title); const preferredLevel = seniorityIndex(title);
    if (jobLevel >= 0 && preferredLevel >= 0) { const gap = Math.abs(jobLevel - preferredLevel); if (gap >= 3) score *= .25; else if (gap === 2) score *= .55; else if (gap === 1) score *= .82; }
    if (score > best) { best = score; bestTitle = title; }
  }
  const rounded = Math.round(best);
  if (rounded >= 14) reasons.strong.push(`${job.title} closely matches your preferred title ${bestTitle}.`);
  else if (rounded <= 7) reasons.gaps.push(`${job.title} is not closely aligned with your preferred titles.`);
  return rounded;
}

function scoreLocation(user: MatchUser, job: MatchJob, reasons: MatchReasons) {
  const location = (job.location ?? "").toLowerCase(); const workplace = (job.workplaceType ?? "").toLowerCase(); const remotePref = (user.remotePreference ?? "").toLowerCase();
  if (!user.preferredLocations.length && !remotePref) { reasons.unknown.push("You have not added location preferences."); return 10; }
  let score = 3;
  if (remotePref === "remote") score = workplace === "remote" || location.includes("remote") ? 15 : workplace === "hybrid" ? 8 : 3;
  else if (remotePref === "hybrid") score = workplace === "hybrid" ? 15 : workplace === "remote" ? 12 : 7;
  else if (remotePref === "flexible") score = 12;
  const locationMatch = user.preferredLocations.some(preferred => { const normalized = preferred.toLowerCase().replace(/,.*$/, "").trim(); return normalized && location.includes(normalized); });
  if (locationMatch) score = 15;
  if (score >= 12) reasons.strong.push(`${job.location ?? job.workplaceType ?? "The work location"} matches your location preference.`);
  else if (!job.location && !job.workplaceType) reasons.unknown.push("The job location is not specified.");
  else reasons.gaps.push(`${job.location ?? job.workplaceType} is outside your strongest location preference.`);
  return score;
}

function scoreEmployment(user: MatchUser, job: MatchJob, reasons: MatchReasons) {
  if (!user.employmentTypes.length) { reasons.unknown.push("You have not selected employment types."); return 7; }
  if (!job.employmentType) { reasons.unknown.push("The employment type is unavailable."); return 7; }
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");
  const matches = user.employmentTypes.some(type => normalize(type) === normalize(job.employmentType!));
  if (matches) reasons.strong.push(`${job.employmentType} matches your employment preference.`); else reasons.gaps.push(`${job.employmentType} is not one of your preferred employment types.`);
  return matches ? 10 : 2;
}

function scoreSalary(user: MatchUser, job: MatchJob, reasons: MatchReasons) {
  if (!user.minimumSalary) { reasons.unknown.push("You have not set a minimum salary."); return 8; }
  const salary = job.salaryMax ?? job.salaryMin;
  if (salary == null) { reasons.unknown.push("Salary information is unavailable."); return 7; }
  if (user.salaryCurrency && job.salaryCurrency && user.salaryCurrency !== job.salaryCurrency) { reasons.unknown.push("The salary uses a different currency, so it was not compared."); return 7; }
  const ratio = salary / user.minimumSalary;
  if (ratio >= 1) { reasons.strong.push("The listed salary meets your minimum."); return 10; }
  if (ratio >= .9) { reasons.gaps.push("The listed salary is slightly below your minimum."); return 7; }
  if (ratio >= .75) { reasons.gaps.push("The listed salary is below your minimum."); return 4; }
  reasons.gaps.push("The listed salary is well below your minimum."); return 1;
}

function scoreAuthorization(user: MatchUser, job: MatchJob, reasons: MatchReasons) {
  const text = job.description.toLowerCase();
  const explicitlyNoSponsorship = /(?:unable|cannot|can't|will not|not able) to (?:provide|offer|support) (?:visa )?sponsorship|no (?:visa )?sponsorship/i.test(text);
  const needsSponsorship = user.workAuthorizations.some(item => item.requiresSponsorship);
  if (explicitlyNoSponsorship && needsSponsorship) { reasons.gaps.push("The job explicitly says sponsorship is unavailable."); return 2; }
  reasons.unknown.push("Sponsorship requirements are not explicitly stated."); return 8;
}

export function calculateJobMatch(user: MatchUser, job: MatchJob): JobMatchResult {
  const reasons: MatchReasons = { strong: [], gaps: [], unknown: [] };
  const skills = scoreSkills(user, job, reasons); const title = scoreTitle(user, job, reasons); const location = scoreLocation(user, job, reasons); const employment = scoreEmployment(user, job, reasons); const salary = scoreSalary(user, job, reasons); const authorization = scoreAuthorization(user, job, reasons);
  return { job_id: job.id, overall_score: Math.max(0, Math.min(100, skills.score + title + location + employment + salary + authorization)), skills_score: skills.score, title_score: title, location_score: location, employment_type_score: employment, salary_score: salary, authorization_score: authorization, matched_skills: skills.matched.map(normalizeSkill), missing_skills: skills.missing.map(normalizeSkill), reasons };
}
