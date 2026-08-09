export type EmailProvider = "GMAIL" | "MICROSOFT";
export type ProviderTokens = { accessToken:string; refreshToken?:string; expiresAt:string; scopes:string[] };
export type MailMessageSummary = { id:string; threadId?:string };
export type MailMessage = {
  id:string; threadId?:string; senderEmail:string|null; subject:string;
  receivedAt:string; text:string; providerAccountId?:string;
};
export type MessagePage = { messages:MailMessageSummary[]; nextCursor?:string };
export interface EmailProviderClient {
  connect(code:string,redirectUri:string):Promise<ProviderTokens>;
  refreshToken(refreshToken:string):Promise<ProviderTokens>;
  listMessages(accessToken:string,cursor?:string,lastSyncAt?:string):Promise<MessagePage>;
  getMessage(accessToken:string,messageId:string):Promise<MailMessage>;
  disconnect(accessToken?:string,refreshToken?:string):Promise<void>;
  getAccount(accessToken:string):Promise<{id:string;email:string}>;
}
