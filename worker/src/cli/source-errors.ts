import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

const cfg=config(),db=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const{data,error}=await db.from("source_scan_runs").select("connector,status,error_code,error_message,started_at,career_sources(companies(name))").eq("status","FAILED").order("started_at",{ascending:false}).limit(10);
if(error)throw new Error(error.message);
console.log(JSON.stringify(data,null,2));
