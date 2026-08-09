import { createClient } from "@supabase/supabase-js";
import { classifyEmail, isLikelyJobEmail, type EmailClassification } from "../../../lib/email/classification";
import { matchEmailToApplication, proposedStatus, type MatchableApplication } from "../../../lib/email/matching";
import { emailProvider } from "../../../lib/email/providers";
import type { EmailProvider, MailMessage } from "../../../lib/email/providers/types";
import { decryptToken, encryptToken } from "../../../lib/email/token-crypto";
import { config } from "../config";
import { classifyAmbiguousEmail } from "./gemini-classify";

type ApplicationRow = MatchableApplication & { status:string };
const safeCode=(error:unknown)=>error instanceof Error?error.message.slice(0,100):"UNKNOWN";
const autoAllowed=(from:string,to:string)=>({SUBMITTED:["READY_TO_APPLY","APPLYING"],INTERVIEW:["SUBMITTED","APPLYING"],REJECTED:["SUBMITTED","INTERVIEW"],OFFER:["SUBMITTED","INTERVIEW"]}as Record<string,string[]>)[to]?.includes(from)??false;
const notificationTitles:Partial<Record<EmailClassification,string>>={RECRUITER_REPLY:"Recruiter replied",ASSESSMENT:"Assessment received",INTERVIEW_REQUEST:"Interview requested",INTERVIEW_SCHEDULED:"Interview scheduled",OFFER:"Offer received",REJECTION:"Application update"};

export async function syncEmailConnection(connectionId:string,requestId?:string){
 const cfg=config(),db=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
 const{data:connection}=await db.from("email_connections").select("*").eq("id",connectionId).eq("status","ACTIVE").maybeSingle();
 if(!connection)return{skipped:true};
 const{data:run}=await db.from("email_sync_runs").insert({user_id:connection.user_id,connection_id:connection.id}).select("id").single();
 if(!run)throw new Error("EMAIL_SYNC_RUN_FAILED");
 let scanned=0,matched=0;
 try{
  const provider=emailProvider(connection.provider as EmailProvider);
  let accessToken=decryptToken(connection.encrypted_access_token);
  if(!connection.token_expires_at||new Date(connection.token_expires_at).getTime()<Date.now()+60_000){
   if(!connection.encrypted_refresh_token)throw new Error("EMAIL_REAUTH_REQUIRED");
   const refreshed=await provider.refreshToken(decryptToken(connection.encrypted_refresh_token));
   accessToken=refreshed.accessToken;
   await db.from("email_connections").update({encrypted_access_token:encryptToken(accessToken),encrypted_refresh_token:refreshed.refreshToken?encryptToken(refreshed.refreshToken):connection.encrypted_refresh_token,token_expires_at:refreshed.expiresAt,status:"ACTIVE"}).eq("id",connection.id);
  }
  const page=await provider.listMessages(accessToken,connection.sync_cursor??undefined,connection.last_successful_sync_at??undefined);
  const{data:rows}=await db.from("applications").select("id,status,created_at,submitted_at,jobs(title,companies(name,website_url),ats_type)").eq("user_id",connection.user_id).neq("status","ARCHIVED");
  const applications:ApplicationRow[]=(rows??[]).map(row=>{const job=row.jobs as unknown as {title:string;companies:{name:string;website_url:string|null};ats_type:string};return{id:row.id,status:row.status,createdAt:row.created_at,submittedAt:row.submitted_at,jobTitle:job?.title??"",companyName:job?.companies?.name??"",companyWebsite:job?.companies?.website_url,atsType:job?.ats_type}});
  const companyNames=applications.map(item=>item.companyName),ids=page.messages.map(item=>item.id);
  const{data:aiConsent}=await db.from("user_consents").select("granted").eq("user_id",connection.user_id).eq("consent_type","AI_EMAIL_CLASSIFICATION").eq("granted",true).limit(1).maybeSingle(),aiAllowed=Boolean(aiConsent?.granted);
  const{data:existing}=ids.length?await db.from("application_email_events").select("provider_message_id").eq("user_id",connection.user_id).eq("provider",connection.provider).in("provider_message_id",ids):{data:[]};
  const seen=new Set((existing??[]).map(item=>item.provider_message_id));
  for(const summary of page.messages){
   if(seen.has(summary.id))continue;
   const message:MailMessage=await provider.getMessage(accessToken,summary.id);
   scanned++;
   if(!isLikelyJobEmail(message,companyNames))continue;
   let classification=classifyEmail(message);
   if(aiAllowed&&classification.classification==="UNKNOWN"){const ai=await classifyAmbiguousEmail(message);if(ai){classification=ai.result;await db.from("ai_usage").insert({user_id:connection.user_id,operation:"EMAIL_CLASSIFICATION",model:ai.usage.model,input_tokens:ai.usage.input,output_tokens:ai.usage.output,estimated_cost:0})}}
   const match=matchEmailToApplication(message,applications),app=applications.find(item=>item.id===match.applicationId);
   const confidence=classification.confidence==="HIGH"&&match.confidence==="HIGH"?"HIGH":match.confidence==="LOW"?"LOW":"MEDIUM",status=proposedStatus(classification.classification),canAuto=Boolean(app&&status&&confidence==="HIGH"&&autoAllowed(app.status,status)),reviewStatus=!app?"UNMATCHED":canAuto?"AUTO_APPLIED":"PENDING",senderDomain=message.senderEmail?.split("@")[1]?.toLowerCase()??null;
   const{data:event}=await db.from("application_email_events").insert({user_id:connection.user_id,application_id:match.applicationId,provider:connection.provider,provider_message_id:message.id,sender_email:message.senderEmail,sender_domain:senderDomain,subject:message.subject.slice(0,500),classification:classification.classification,confidence,received_at:message.receivedAt,matched_by:match.reasons,proposed_status:status,review_status:reviewStatus}).select("id").maybeSingle();
   if(!event)continue;
   if(app)matched++;
   if(canAuto&&app&&status){
    const now=new Date().toISOString();
    await db.from("applications").update({status,last_activity_at:now,...(status==="SUBMITTED"?{submitted_at:now}:{})}).eq("id",app.id).eq("user_id",connection.user_id);
    await db.from("application_events").insert({application_id:app.id,user_id:connection.user_id,event_type:"EMAIL_STATUS_AUTO_UPDATED",event_data:{emailEventId:event.id,classification:classification.classification,sender:message.senderEmail,subject:message.subject.slice(0,500)},dedupe_key:`email:${message.id}`});
   }
   if(app){
    const title=notificationTitles[classification.classification]??"Application email update";
    await db.from("notifications").insert({user_id:connection.user_id,type:"EMAIL_APPLICATION_UPDATE",title,message:confidence==="HIGH"?message.subject.slice(0,500):`Review a possible match: ${message.subject.slice(0,400)}`});
   }
  }
  const now=new Date().toISOString();
  await db.from("email_connections").update({sync_cursor:page.nextCursor??null,last_sync_at:now,last_successful_sync_at:now,last_error_code:null,status:"ACTIVE"}).eq("id",connection.id);
  await db.from("email_sync_runs").update({completed_at:now,messages_scanned:scanned,messages_matched:matched,status:"COMPLETED"}).eq("id",run.id);
  if(requestId)await db.from("email_sync_requests").update({status:"COMPLETED",completed_at:now}).eq("id",requestId);
  return{scanned,matched};
 }catch(error){
  const code=safeCode(error),reauth=/401|REAUTH|TOKEN/i.test(code),now=new Date().toISOString();
  await db.from("email_connections").update({status:reauth?"REAUTH_REQUIRED":"ERROR",last_error_code:code,last_sync_at:now}).eq("id",connection.id);
  await db.from("email_sync_runs").update({completed_at:now,messages_scanned:scanned,messages_matched:matched,errors:[{code}],status:"FAILED"}).eq("id",run.id);
  if(requestId)await db.from("email_sync_requests").update({status:"FAILED",completed_at:now}).eq("id",requestId);
  throw error;
 }
}
