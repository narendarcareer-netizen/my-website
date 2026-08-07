const TEMPORARY=new Set([408,429,500,502,503,504]),hostLastRequest=new Map<string,number>();
const waits=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export class SourceError extends Error{constructor(public code:string,message:string,public retryable=false){super(message)}}

export function requestFactory(hostDelayMs=300){return async(url:string,init:RequestInit={})=>{
 const host=new URL(url).hostname.toLowerCase(),last=hostLastRequest.get(host)??0,wait=Math.max(0,hostDelayMs-(Date.now()-last));if(wait)await waits(wait);hostLastRequest.set(host,Date.now());let error:unknown;
 for(let attempt=0;attempt<3;attempt++){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15_000);try{const response=await fetch(url,{...init,signal:init.signal??controller.signal,headers:{Accept:"application/json","User-Agent":"JobPilot-Ingestion/1.0",...init.headers}});if(response.ok)return response;if(!TEMPORARY.has(response.status))throw new SourceError(`HTTP_${response.status}`,`Source returned HTTP ${response.status}`,false);error=new SourceError(`HTTP_${response.status}`,`Temporary source failure ${response.status}`,true);const retryAfter=Number(response.headers.get("retry-after"));await waits(Number.isFinite(retryAfter)&&retryAfter>0?retryAfter*1000:500*2**attempt+Math.random()*250)}catch(caught){if(caught instanceof SourceError&&!caught.retryable)throw caught;error=caught;if(attempt<2)await waits(500*2**attempt+Math.random()*250)}finally{clearTimeout(timeout)}}
 throw error instanceof Error?error:new SourceError("NETWORK_ERROR","Source request failed",true);
};}
