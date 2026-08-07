import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { connectors } from "../../../lib/jobs/platform/connectors";
import { requestFactory, SourceError } from "../../../lib/jobs/platform/http";
import type { CareerSource } from "../../../lib/jobs/platform/types";
import { config } from "../config";
import { detectAnomaly } from "./anomaly";
import { healthAfter, nextScan } from "./health";

type ExistingJob={id:string;external_id:string;content_hash:string;status:string;missing_scan_count:number;title:string;location:string|null;salary_min:number|null;salary_max:number|null;description:string;[key:string]:unknown};
const historyFields=["title","location","salary_min","salary_max","description","status"];

export async function scanSource(sourceId:string){
 const cfg=config(),db=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),started=Date.now();
 const{data:row}=await db.from("career_sources").select("*,companies(name)").eq("id",sourceId).eq("active",true).maybeSingle();
 if(!row)throw new Error("SOURCE_NOT_FOUND");
 const source:CareerSource={id:row.id,companyId:row.company_id,companyName:row.companies.name,atsType:row.ats_type,identifier:row.ats_identifier,sourceUrl:row.source_url,previousJobCount:row.jobs_last_seen};
 const connector=connectors.get(source.atsType);if(!connector)throw new Error("UNSUPPORTED_ATS");
 // Adopt jobs imported by the earlier synchronous connector instead of creating duplicates.
 await db.from("jobs").update({source_id:source.id}).eq("company_id",source.companyId).eq("ats_type",source.atsType.toLowerCase()).is("source_id",null);
 const{data:run}=await db.from("source_scan_runs").insert({source_id:source.id,connector:connector.atsType,connector_version:connector.version,status:"RUNNING"}).select("id").single();
 try{
  const raw=await connector.fetchJobs(source,{signal:new AbortController().signal,request:requestFactory()}),jobs=raw.map(j=>connector.normalizeJob(j,source)),anomaly=detectAnomaly(source.previousJobCount,jobs.length);
  const existingResult=await db.from("jobs").select("id,external_id,content_hash,status,missing_scan_count,title,location,salary_min,salary_max,description").eq("source_id",source.id),existing=(existingResult.data??[])as ExistingJob[],byId=new Map(existing.map(j=>[j.external_id,j])),seen=new Set<string>();
  let inserted=0,updated=0,unchanged=0,closed=0;
  for(const job of jobs){
   seen.add(job.externalId);const old=byId.get(job.externalId),record:Record<string,unknown>={source_id:source.id,company_id:source.companyId,external_id:job.externalId,ats_type:source.atsType.toLowerCase(),source_url:job.sourceUrl,apply_url:job.applyUrl,canonical_apply_url:job.applyUrl,title:job.title,description:job.description,location:job.location,workplace_type:job.workplaceType,employment_type:job.employmentType,salary_min:job.salary.min,salary_max:job.salary.max,salary_currency:job.salary.currency,posted_at:job.postedAt,updated_at:job.updatedAt??new Date().toISOString(),status:"active",content_hash:job.contentHash,source_metadata:{...job.sourceMetadata,connectorVersion:connector.version},missing_scan_count:0};
   if(old?.content_hash===job.contentHash&&old.status==="active"){unchanged++;if(old.missing_scan_count)await db.from("jobs").update({missing_scan_count:0}).eq("id",old.id);continue}
   const saved=await db.from("jobs").upsert(record,{onConflict:"source_id,external_id"}).select("id").single();if(saved.error)throw saved.error;
   if(old){updated++;const changed=historyFields.filter(k=>JSON.stringify(old[k])!==JSON.stringify(record[k]));if(changed.length)await db.from("job_change_history").insert({job_id:old.id,change_type:"UPDATED",changed_fields:changed,previous_values:Object.fromEntries(changed.map(k=>[k,old[k]])),new_values:Object.fromEntries(changed.map(k=>[k,record[k]]))})}else inserted++;
  }
  const missing=existing.filter(j=>j.status==="active"&&!seen.has(j.external_id));
  if(!anomaly.anomaly)for(const old of missing){const count=old.missing_scan_count+1;await db.from("jobs").update({missing_scan_count:count,...(count>=3?{status:"closed"}:{})}).eq("id",old.id);if(count>=3)closed++}
  else await db.from("ingestion_alerts").insert({source_id:source.id,type:"POSSIBLE_SOURCE_ANOMALY",severity:"CRITICAL",title:"Job count collapsed",message:`Source changed from ${source.previousJobCount} to ${jobs.length} jobs; closures were paused.`});
  const now=new Date().toISOString(),status=anomaly.anomaly?"ANOMALY":"SUCCEEDED";
  await db.from("source_scan_runs").update({status,completed_at:now,response_ms:Date.now()-started,discovered_count:jobs.length,inserted_count:inserted,updated_count:updated,unchanged_count:unchanged,missing_count:missing.length,closed_count:closed,response_hash:createHash("sha256").update(jobs.map(j=>j.contentHash).sort().join("")).digest("hex")}).eq("id",run!.id);
  await db.from("career_sources").update({last_scan_at:now,last_success_at:now,next_scan_at:nextScan(row.scan_interval_minutes,0,true),consecutive_failures:0,health_status:anomaly.anomaly?"DEGRADED":"HEALTHY",jobs_last_seen:jobs.length,anomaly_pending_count:anomaly.anomaly?row.anomaly_pending_count+1:0,last_error_code:anomaly.reason,last_error_message:null}).eq("id",source.id);
  console.info(JSON.stringify({event:"source_scan",source_id:source.id,scan_run_id:run!.id,connector:connector.version,duration_ms:Date.now()-started,counts:{discovered:jobs.length,inserted,updated,unchanged,missing:missing.length,closed},status}));return{inserted,updated,unchanged,missing:missing.length,closed,anomaly:anomaly.anomaly};
 }catch(error){const objectMessage=typeof error==="object"&&error!==null&&"message"in error?String(error.message):null,code=error instanceof SourceError?error.code:(typeof error==="object"&&error!==null&&"code"in error?String(error.code):"SCAN_FAILED"),message=(error instanceof Error?error.message:objectMessage??"Scan failed").slice(0,1000),now=new Date().toISOString(),failures=row.consecutive_failures+1;await Promise.all([db.from("source_scan_runs").update({status:"FAILED",completed_at:now,response_ms:Date.now()-started,error_code:code,error_message:message}).eq("id",run!.id),db.from("career_sources").update({last_scan_at:now,next_scan_at:nextScan(row.scan_interval_minutes,row.consecutive_failures,false),consecutive_failures:failures,health_status:healthAfter(true,false,row.consecutive_failures),last_error_code:code,last_error_message:message}).eq("id",source.id)]);throw error}
}
