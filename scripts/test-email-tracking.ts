import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyEmail,isLikelyJobEmail } from "../lib/email/classification";
import { matchEmailToApplication } from "../lib/email/matching";
import type { MailMessage } from "../lib/email/providers/types";
const fixture=(name:string)=>JSON.parse(readFileSync(resolve("tests/fixtures/email",`${name}.json`),"utf8"))as MailMessage;
const expected={application_confirmation:"APPLICATION_CONFIRMATION",recruiter_reply:"RECRUITER_REPLY",assessment:"ASSESSMENT",interview:"INTERVIEW_REQUEST",rejection:"REJECTION",offer:"OFFER"}as const;
for(const[name,classification]of Object.entries(expected)){const message=fixture(name.replaceAll("_","-"));assert.equal(isLikelyJobEmail(message,["Figma"]),true);assert.equal(classifyEmail(message).classification,classification)}
assert.equal(isLikelyJobEmail(fixture("unrelated-email"),["Figma"]),false);
assert.equal(classifyEmail(fixture("ambiguous-email")).confidence,"MEDIUM");
const application={id:"11111111-1111-4111-8111-111111111111",createdAt:"2026-08-01T00:00:00Z",submittedAt:"2026-08-09T00:00:00Z",jobTitle:"Software Engineer",companyName:"Figma",companyWebsite:"https://figma.com"};
const high=matchEmailToApplication(fixture("interview"),[application]);assert.equal(high.applicationId,application.id);assert.equal(high.confidence,"HIGH");
const low=matchEmailToApplication(fixture("unrelated-email"),[application]);assert.equal(low.confidence,"LOW");
const ids=new Set<string>(),message=fixture("offer");ids.add(message.id);ids.add(message.id);assert.equal(ids.size,1,"provider message IDs remain idempotent");
console.log("Email classification, matching, filtering, and duplicate-protection fixtures passed.");
