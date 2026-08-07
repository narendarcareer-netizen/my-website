import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApplicationStatus } from "./types";
import { canTransition } from "./status-rules";
export async function addApplicationEvent(applicationId:string,userId:string,eventType:string,eventData:Record<string,unknown>={},dedupeKey?:string){
  const db=createAdminClient(); const payload={application_id:applicationId,user_id:userId,event_type:eventType,event_data:eventData,dedupe_key:dedupeKey??null};
  if(dedupeKey) await db.from("application_events").upsert(payload,{onConflict:"application_id,event_type,dedupe_key",ignoreDuplicates:true}); else await db.from("application_events").insert(payload);
}
export async function transitionApplication(applicationId:string,userId:string,to:ApplicationStatus,options:{manual?:boolean;eventType?:string;data?:Record<string,unknown>}={}){
  const db=createAdminClient(); const {data:app}=await db.from("applications").select("id,status").eq("id",applicationId).eq("user_id",userId).maybeSingle();
  if(!app) throw new Error("APPLICATION_NOT_FOUND"); const from=app.status as ApplicationStatus;
  if(from===to) return; if(!options.manual&&!canTransition(from,to)) throw new Error("INVALID_TRANSITION");
  const now=new Date().toISOString(); const update:Record<string,unknown>={status:to,last_activity_at:now};
  if(to==="APPLYING") update.started_at=now; if(to==="SUBMITTED") update.submitted_at=now;
  const {error}=await db.from("applications").update(update).eq("id",applicationId).eq("user_id",userId); if(error) throw new Error("STATUS_UPDATE_FAILED");
  await addApplicationEvent(applicationId,userId,options.eventType??"STATUS_CHANGED",{from,to,...options.data},`${from}:${to}`);
  if(to==="READY_TO_APPLY"||to==="NEEDS_USER_ACTION"){const title=to==="READY_TO_APPLY"?"Application ready to submit":"Application needs attention";await db.from("notifications").insert({user_id:userId,type:to,title,message:to==="READY_TO_APPLY"?"Your approved documents are ready. Open the employer site when you choose.":"Review the application and resolve the required action."});}
}
