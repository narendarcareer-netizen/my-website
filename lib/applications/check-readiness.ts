import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionApplication } from "./status-machine";
import type { DocumentReadiness } from "./types";

function state(rows:{status:string}[]):DocumentReadiness{return rows.some(r=>r.status==="approved")?"approved":rows.length?"draft":"missing";}
export async function checkApplicationReadiness(applicationId:string,userId:string){
 const db=createAdminClient(); const {data:app}=await db.from("applications").select("id,job_id,status,jobs(description)").eq("id",applicationId).eq("user_id",userId).maybeSingle(); if(!app) throw new Error("APPLICATION_NOT_FOUND");
 const {data:drafts}=await db.from("job_document_drafts").select("id,document_type,status,updated_at").eq("user_id",userId).eq("job_id",app.job_id).order("updated_at",{ascending:false});
 const resumeRows=(drafts??[]).filter(d=>d.document_type==="resume_suggestions"); const coverRows=(drafts??[]).filter(d=>d.document_type==="cover_letter");
 const description=((app.jobs as unknown as {description?:string}|null)?.description??"").toLowerCase(); const coverRequired=/cover letter.{0,30}(required|must)|(?:required|must).{0,30}cover letter/.test(description);
 const resume=state(resumeRows); const cover=coverRequired?state(coverRows):(coverRows.some(d=>d.status==="approved")?"approved":"optional"); const ready=resume==="approved"&&(cover==="approved"||cover==="optional");
 const resumeDraft=resumeRows.find(d=>d.status==="approved"); const coverDraft=coverRows.find(d=>d.status==="approved");
 await db.from("applications").update({selected_resume_draft_id:resumeDraft?.id??null,selected_cover_letter_draft_id:coverDraft?.id??null,last_activity_at:new Date().toISOString()}).eq("id",applicationId).eq("user_id",userId);
 if(ready&&app.status!=="READY_TO_APPLY") await transitionApplication(applicationId,userId,"READY_TO_APPLY",{manual:true,eventType:"DOCUMENT_APPROVED"});
 else if(!ready&&!["SAVED","PREPARING","NEEDS_REVIEW"].includes(app.status)) await transitionApplication(applicationId,userId,"NEEDS_REVIEW",{manual:true});
 return {resume,cover,coverRequired,ready};
}
export async function syncApplicationReadinessForJob(userId:string,jobId:string){const db=createAdminClient();const {data}=await db.from("applications").select("id").eq("user_id",userId).eq("job_id",jobId).maybeSingle();if(data) return checkApplicationReadiness(data.id,userId);}
