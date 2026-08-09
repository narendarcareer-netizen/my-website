import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { hostname } from "node:os";
import { createClient } from "@supabase/supabase-js";
import { UnrecoverableError, Worker } from "bullmq";
import { SourceError } from "../../lib/jobs/platform/http";
import { syncEmailConnection } from "./email/sync-connection";
import { processOnboarding } from "./jobs/onboard-sources";
import { scanSource } from "./jobs/scan-source";
import { config } from "./config";
import { queueNames } from "./queues/names";
import { redis } from "./queues/client";
import { scheduleDueSources } from "./schedulers/source-scheduler";
import { scheduleEmailSyncs } from "./schedulers/email-scheduler";

const cfg=config(),workerId=randomUUID(),workerDb=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}),startedAt=new Date().toISOString();
let heartbeatOk=false;
async function heartbeat(){const{error}=await workerDb.from("worker_instances").upsert({id:workerId,hostname:hostname(),version:"worker@0.2.0",started_at:startedAt,last_heartbeat_at:new Date().toISOString(),metadata:{environment:cfg.APP_ENV}},{onConflict:"id"});heartbeatOk=!error}
await heartbeat();
const heartbeatTimer=setInterval(()=>heartbeat().catch(()=>{heartbeatOk=false}),30_000);
const scanWorker=new Worker(queueNames.scan,async job=>{try{return await scanSource(job.data.sourceId)}catch(error){if(error instanceof SourceError&&!error.retryable)throw new UnrecoverableError(error.message);throw error}},{connection:redis(),concurrency:cfg.WORKER_CONCURRENCY,limiter:{max:10,duration:1000}});
const emailWorker=new Worker(queueNames.emailSync,job=>syncEmailConnection(job.data.connectionId,job.data.requestId),{connection:redis(),concurrency:Math.min(3,cfg.WORKER_CONCURRENCY),limiter:{max:5,duration:1000}});
const safeError=(error:unknown)=>error instanceof Error?error.message:(typeof error==="object"&&error!==null&&"message"in error?String(error.message):"UNKNOWN").slice(0,200);
scanWorker.on("failed",(job,error)=>console.error(JSON.stringify({event:"worker_job_failed",queue:queueNames.scan,job_id:job?.id,error_code:error.message.slice(0,100)})));
emailWorker.on("failed",(job,error)=>console.error(JSON.stringify({event:"worker_job_failed",queue:queueNames.emailSync,job_id:job?.id,error_code:error.message.slice(0,100)})));
const tick=()=>Promise.all([scheduleDueSources(),processOnboarding(),scheduleEmailSyncs()]).catch(error=>console.error(JSON.stringify({event:"scheduler_failed",error_code:safeError(error)})));
const timer=setInterval(tick,60_000);
await tick();
const healthServer=createServer(async(request,response)=>{if(request.url!=="/health"){response.writeHead(404).end();return}let queueOk=false;try{queueOk=await redis().ping()==="PONG"}catch{}response.writeHead(heartbeatOk&&queueOk?200:503,{"Content-Type":"application/json","Cache-Control":"no-store"});response.end(JSON.stringify({status:heartbeatOk&&queueOk?"ok":"degraded",queue:queueOk?"ok":"unavailable",heartbeat:heartbeatOk?"ok":"unavailable",version:"worker@0.2.0"}))}).listen(cfg.PORT);
console.info(JSON.stringify({event:"worker_started",concurrency:cfg.WORKER_CONCURRENCY,email_concurrency:Math.min(3,cfg.WORKER_CONCURRENCY),port:cfg.PORT}));
async function shutdown(){clearInterval(timer);clearInterval(heartbeatTimer);healthServer.close();await Promise.all([scanWorker.close(),emailWorker.close()]);await redis().quit();process.exit(0)}
process.on("SIGINT",shutdown);
process.on("SIGTERM",shutdown);
