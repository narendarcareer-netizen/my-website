"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkApplicationReadiness } from "@/lib/applications/check-readiness";
import { addApplicationEvent, transitionApplication } from "@/lib/applications/status-machine";
import { snapshotApplicationDocuments } from "@/lib/applications/snapshot-documents";
import { APPLICATION_STATUSES } from "@/lib/applications/types";

async function user(){const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)throw new Error("AUTH_REQUIRED");return user;}
const uuid=z.string().uuid();
export async function addToApplicationQueue(formData:FormData){const jobId=uuid.parse(formData.get("jobId"));const u=await user();const db=createAdminClient();const [{data:job},{data:match}]=await Promise.all([db.from("jobs").select("id,apply_url,status").eq("id",jobId).maybeSingle(),db.from("job_matches").select("overall_score").eq("user_id",u.id).eq("job_id",jobId).maybeSingle()]);if(!job)throw new Error("JOB_NOT_FOUND");const {data:app}=await db.from("applications").upsert({user_id:u.id,job_id:job.id,status:"SAVED",match_score:match?.overall_score??null,source_apply_url:job.apply_url},{onConflict:"user_id,job_id",ignoreDuplicates:true}).select("id").maybeSingle();let id=app?.id;if(!id){const {data:existing}=await db.from("applications").select("id").eq("user_id",u.id).eq("job_id",jobId).maybeSingle();if(!existing)throw new Error("APPLICATION_CREATE_FAILED");id=existing.id;}await addApplicationEvent(id,u.id,"APPLICATION_CREATED",{},"created");revalidatePath("/applications");redirect(`/applications/${id}`);}
export async function updateApplicationStatus(formData:FormData){
 const applicationId=uuid.parse(formData.get("applicationId")); const to=z.enum(APPLICATION_STATUSES).parse(formData.get("status")); const manual=formData.get("manual")==="true"; const u=await user();
 if(to==="SUBMITTED"){const readiness=await checkApplicationReadiness(applicationId,u.id);if(!readiness.ready)redirect(`/applications/${applicationId}?error=not-ready`);await snapshotApplicationDocuments(applicationId,u.id);await transitionApplication(applicationId,u.id,to,{eventType:"APPLICATION_MARKED_SUBMITTED"});}
 else if(to==="READY_TO_APPLY"){const readiness=await checkApplicationReadiness(applicationId,u.id);if(!readiness.ready)redirect(`/applications/${applicationId}?error=not-ready`);}
 else await transitionApplication(applicationId,u.id,to,{manual});
 revalidatePath("/applications");revalidatePath(`/applications/${applicationId}`);revalidatePath("/tracker");revalidatePath("/dashboard");
}
export async function addApplicationNote(formData:FormData){const applicationId=uuid.parse(formData.get("applicationId"));const content=z.string().trim().min(1).max(5000).parse(formData.get("content"));const u=await user();const db=createAdminClient();const {data:app}=await db.from("applications").select("id").eq("id",applicationId).eq("user_id",u.id).maybeSingle();if(!app)throw new Error("APPLICATION_NOT_FOUND");await db.from("application_notes").insert({application_id:applicationId,user_id:u.id,content});await db.from("applications").update({last_activity_at:new Date().toISOString()}).eq("id",applicationId).eq("user_id",u.id);await addApplicationEvent(applicationId,u.id,"NOTE_ADDED",{},crypto.randomUUID());revalidatePath(`/applications/${applicationId}`);}
export async function refreshReadiness(formData:FormData){const applicationId=uuid.parse(formData.get("applicationId"));const u=await user();await checkApplicationReadiness(applicationId,u.id);revalidatePath(`/applications/${applicationId}`);revalidatePath("/applications");}
