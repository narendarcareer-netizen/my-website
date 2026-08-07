import type { Job } from "@/types/job";

export const jobs: Job[] = [
  { id: 1, company: "Northstar Labs", companyInitials: "NL", position: "Senior Product Designer", location: "New York, NY · Hybrid", salary: "$145k–$175k", employmentType: "Full-time", match: 94, skills: ["Product Design", "Figma", "Design Systems"], datePosted: "2 hours ago", status: "Interview", accent: "bg-blue-600" },
  { id: 2, company: "Lattice Works", companyInitials: "LW", position: "UX Research Lead", location: "Remote · US", salary: "$135k–$160k", employmentType: "Full-time", match: 89, skills: ["Research", "Strategy", "B2B SaaS"], datePosted: "Today", status: "Applied", accent: "bg-emerald-600" },
  { id: 3, company: "Common Thread", companyInitials: "CT", position: "Product Design Manager", location: "Austin, TX · Hybrid", salary: "$155k–$185k", employmentType: "Full-time", match: 86, skills: ["Leadership", "UX", "Roadmapping"], datePosted: "1 day ago", status: "Saved", accent: "bg-orange-500" },
  { id: 4, company: "Bright Health Co.", companyInitials: "BH", position: "Staff Experience Designer", location: "Boston, MA · Remote", salary: "$150k–$180k", employmentType: "Full-time", match: 82, skills: ["Healthcare", "Prototyping", "Research"], datePosted: "2 days ago", status: "Preparing", accent: "bg-rose-500" },
  { id: 5, company: "Orbit Finance", companyInitials: "OF", position: "Senior UX Designer", location: "Chicago, IL · Hybrid", salary: "$125k–$150k", employmentType: "Contract", match: 78, skills: ["Fintech", "Mobile", "Interaction"], datePosted: "3 days ago", status: "Closed", accent: "bg-violet-600" },
  { id: 6, company: "Fieldnote", companyInitials: "FN", position: "Founding Product Designer", location: "Remote · Americas", salary: "$140k–$170k + equity", employmentType: "Full-time", match: 91, skills: ["0→1", "Brand", "Product Strategy"], datePosted: "4 hours ago", status: "Offer", accent: "bg-cyan-600" },
];
