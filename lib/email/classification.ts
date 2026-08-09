import type { MailMessage } from "./providers/types";
export const EMAIL_CLASSIFICATIONS=["APPLICATION_CONFIRMATION","RECRUITER_REPLY","ASSESSMENT","INTERVIEW_REQUEST","INTERVIEW_SCHEDULED","REJECTION","OFFER","ACTION_REQUIRED","GENERAL_UPDATE","UNKNOWN"]as const;
export type EmailClassification=typeof EMAIL_CLASSIFICATIONS[number];
export type ClassificationResult={classification:EmailClassification;confidence:"HIGH"|"MEDIUM"|"LOW";reasons:string[]};
const rules:Array<[EmailClassification,RegExp[]]>= [
 ["REJECTION",[/unfortunately/i,/not moving forward/i,/other candidates/i,/not selected/i]],
 ["OFFER",[/offer of employment/i,/job offer/i,/pleased to offer/i,/offer letter/i]],
 ["INTERVIEW_SCHEDULED",[/interview (?:is )?scheduled/i,/calendar invitation/i,/confirmed.*interview/i]],
 ["INTERVIEW_REQUEST",[/schedule (?:an|your) interview/i,/interview availability/i,/invite you to interview/i,/meet with (?:the|our) team/i]],
 ["ASSESSMENT",[/coding (?:test|assessment)/i,/take-home/i,/technical assessment/i,/complete.*assessment/i]],
 ["APPLICATION_CONFIRMATION",[/application (?:has been )?received/i,/thank you for applying/i,/we received your application/i]],
 ["ACTION_REQUIRED",[/action required/i,/additional information/i,/complete your application/i]],
 ["RECRUITER_REPLY",[/recruiter/i,/talent acquisition/i,/following up/i,/regarding your application/i]],
 ["GENERAL_UPDATE",[/application update/i,/status update/i]]
];
export function isLikelyJobEmail(message:MailMessage,companyNames:string[]=[]){const text=`${message.subject} ${message.text.slice(0,4000)} ${message.senderEmail??""}`;return/(application|interview|assessment|recruiter|talent acquisition|offer|job|position|candidate|hiring)/i.test(text)||companyNames.some(name=>name.length>2&&text.toLowerCase().includes(name.toLowerCase()))}
export function classifyEmail(message:MailMessage):ClassificationResult{const text=`${message.subject}\n${message.text.slice(0,8000)}`;for(const[classification,patterns]of rules){const matched=patterns.filter(pattern=>pattern.test(text));if(matched.length)return{classification,confidence:matched.length>1||classification==="REJECTION"||classification==="OFFER"?"HIGH":"MEDIUM",reasons:[`Matched ${classification.toLowerCase().replaceAll("_"," ")} language`]}}return{classification:"UNKNOWN",confidence:"LOW",reasons:["No deterministic job-email rule matched"]}}
