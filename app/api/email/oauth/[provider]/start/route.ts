import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEmailOAuthUrl } from "@/lib/email/oauth";
import { rateLimit } from "@/lib/security/rate-limit";
import type { EmailProvider } from "@/lib/email/providers/types";
const providerValue=(value:string):EmailProvider|null=>value==="gmail"?"GMAIL":value==="microsoft"?"MICROSOFT":null;
export async function GET(request:Request,{params}:{params:Promise<{provider:string}>}){const provider=providerValue((await params).provider);if(!provider)return NextResponse.json({error:"Unsupported provider"},{status:404});const db=await createClient(),{data:{user}}=await db.auth.getUser();if(!user)return NextResponse.redirect(new URL("/login",request.url));if(!(await rateLimit("email-oauth",user.id,10,3600)).success)return NextResponse.json({error:"Too many connection attempts"},{status:429});try{return NextResponse.redirect(await createEmailOAuthUrl(user.id,provider))}catch{return NextResponse.redirect(new URL("/settings/integrations/email?error=configuration",request.url))}}
