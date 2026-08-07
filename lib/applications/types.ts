export const APPLICATION_STATUSES = ["SAVED","PREPARING","NEEDS_REVIEW","READY_TO_APPLY","APPLYING","NEEDS_USER_ACTION","SUBMITTED","INTERVIEW","REJECTED","OFFER","WITHDRAWN","FAILED","ARCHIVED"] as const;
export type ApplicationStatus = typeof APPLICATION_STATUSES[number];
export type DocumentReadiness = "missing" | "draft" | "approved" | "optional";
