import assert from "node:assert/strict";
import { calculateJobMatch } from "../lib/matching/calculate-job-match";
import { normalizeSkills } from "../lib/matching/normalize-skill";
import type { MatchJob, MatchUser } from "../lib/matching/types";

const user: MatchUser = {
  preferredTitles: ["Frontend Engineer", "Software Engineer", "Solutions Engineer"], preferredLocations: ["Remote", "New York"], remotePreference: "Remote", employmentTypes: ["Full-time"], minimumSalary: 120000, salaryCurrency: "USD",
  skills: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Git", "Figma"], workAuthorizations: [{ country: "United States", authorizationType: "Citizen", requiresSponsorship: false }],
};
const relevant: MatchJob = { id: "relevant", title: "Senior Frontend Engineer", description: "Build products with React, TypeScript, JavaScript, and GraphQL. This is a remote full-time role.", location: "Remote - United States", workplaceType: "Remote", employmentType: "Full-time", salaryMin: 130000, salaryMax: 160000, salaryCurrency: "USD", skills: ["react", "typescript", "javascript", "graphql"] };
const irrelevant: MatchJob = { id: "irrelevant", title: "Director of Enterprise Sales", description: "Lead an on-site sales organization.", location: "Tokyo, Japan", workplaceType: "On-site", employmentType: "Full-time", salaryMin: null, salaryMax: null, salaryCurrency: null, skills: ["salesforce"] };
const good = calculateJobMatch(user, relevant); const poor = calculateJobMatch(user, irrelevant);
assert.ok(good.overall_score > poor.overall_score, "Relevant engineering job should rank above unrelated sales job.");
assert.deepEqual(good.matched_skills.sort(), ["javascript", "react", "typescript"]);
assert.deepEqual(good.missing_skills, ["graphql"]);
assert.equal(poor.salary_score, 7, "Unknown salary should receive a neutral score.");
assert.equal(poor.authorization_score, 8, "Unknown sponsorship should not be treated as rejection.");
assert.deepEqual(normalizeSkills(["JS", "javascript", "React.js", "react", "postgres", "PostgreSQL"]), ["javascript", "react", "postgresql"], "Aliases should normalize and deduplicate.");
console.log("Matching tests passed", { relevantScore: good.overall_score, irrelevantScore: poor.overall_score, unknownSalaryScore: poor.salary_score, unknownAuthorizationScore: poor.authorization_score });
