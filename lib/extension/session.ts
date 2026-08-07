import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function hashExtensionToken(token:string){return createHash("sha256").update(token).digest("hex");}
export function newExtensionToken(){return randomBytes(32).toString("base64url");}
export async function authenticateExtension(request:Request){const value=request.headers.get("authorization");if(!value?.startsWith("Bearer "))return null;const token=value.slice(7);if(token.length<32)return null;const db=createAdminClient();const {data}=await db.from("extension_sessions").select("id,user_id,application_id,resume_version_id,cover_letter_version_id,expires_at,revoked_at").eq("token_hash",hashExtensionToken(token)).maybeSingle();if(!data||data.revoked_at||new Date(data.expires_at)<=new Date())return null;return {...data,token};}
export function extensionCors(request:Request):Record<string,string>{const origin=request.headers.get("origin")??"",allowed=new Set((process.env.EXTENSION_ALLOWED_ORIGINS??"").split(",").map(v=>v.trim()).filter(Boolean)),development=(process.env.APP_ENV??"development")==="development";const headers:Record<string,string>={"Access-Control-Allow-Headers":"authorization,content-type","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Vary":"Origin"};if(origin.startsWith("chrome-extension://")&&(development||allowed.has(origin)))headers["Access-Control-Allow-Origin"]=origin;return headers;}
