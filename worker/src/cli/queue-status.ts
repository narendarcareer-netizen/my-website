import { createClient } from "@supabase/supabase-js";
import { config } from "../config";
import { queues, redis } from "../queues/client";

const cfg=config(),db=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const{data,error}=await db.from("career_sources").select("id,ats_type,active,health_status,last_scan_at,next_scan_at,last_error_code,companies(name)").order("created_at");
if(error)throw new Error(error.message);
const queue=queues().scan;
for(const source of data??[]){const job=await queue.getJob(`scan-${source.id}`);console.log({company:(source.companies as unknown as {name:string})?.name,active:source.active,health:source.health_status,lastScan:source.last_scan_at,nextScan:source.next_scan_at,error:source.last_error_code,queueState:job?await job.getState():"none",attemptsMade:job?.attemptsMade??0});}
await queue.close();await redis().quit();
