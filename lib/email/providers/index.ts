import { gmailProvider } from "./gmail";
import { microsoftProvider } from "./microsoft";
import type { EmailProvider } from "./types";
export const emailProvider=(provider:EmailProvider)=>provider==="GMAIL"?gmailProvider:microsoftProvider;
