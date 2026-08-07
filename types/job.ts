export type ApplicationStatus = "Saved" | "Preparing" | "Applied" | "Interview" | "Offer" | "Closed";

export interface Job {
  id: number;
  company: string;
  companyInitials: string;
  position: string;
  location: string;
  salary: string;
  employmentType: "Full-time" | "Contract" | "Part-time";
  match: number;
  skills: string[];
  datePosted: string;
  status: ApplicationStatus;
  accent: string;
}
