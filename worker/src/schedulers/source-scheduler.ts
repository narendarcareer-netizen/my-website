import { createClient } from "@supabase/supabase-js";
import { config } from "../config";
import { queues } from "../queues/client";

export async function scheduleDueSources(limit=500){
 const cfg=config(),db=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),now=new Date().toISOString();
 const{data,error}=await db.from("career_sources").select("id").eq("active",true).lte("next_scan_at",now).order("next_scan_at").limit(limit);if(error)throw error;
 const queue=queues().scan;
 for(const source of data??[]){
  const jobId=`scan-${source.id}`,prior=await queue.getJob(jobId);
  if(prior&&await prior.getState()==="failed")await prior.remove(); // Durable failure details remain in source_scan_runs.
  await queue.add("SCAN_SOURCE",{sourceId:source.id},{jobId,removeOnComplete:true,removeOnFail:true});
 }
 return data?.length??0;
}
