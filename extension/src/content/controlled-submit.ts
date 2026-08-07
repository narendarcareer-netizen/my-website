import { detectAts } from "./detect-ats";
import type { ApplicationData, SessionState } from "../shared/types";

type ApiResult<T> = { ok: boolean; status?: number; data?: T };
type Classification = "SAFE_PROFILE"|"SAVED_USER_ANSWER"|"GENERATED_TEXT"|"SENSITIVE"|"LEGAL"|"UNKNOWN";
type ReviewField = { id:string; fieldType:string; classification:Classification; required:boolean; filled:boolean; source?:"profile"|"saved_answer"|"generated_approved"|"document"|"user"; approved?:boolean; confidence:number };
const send = <T,>(message: unknown) => new Promise<T>(resolve => chrome.runtime.sendMessage(message, resolve));

function labelFor(element: HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement) {
  const explicit = element.id ? document.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(element.id)}"]`)?.innerText : "";
  return [explicit, element.getAttribute("aria-label"), element.getAttribute("placeholder"), element.name, element.id, element.closest("label")?.innerText].filter(Boolean).join(" ").slice(0, 300);
}
function classify(text: string): Classification {
  const value = text.toLowerCase();
  if (/race|ethnicity|gender|sex|disability|veteran|religion|medical|social security|government id|criminal history/.test(value)) return "SENSITIVE";
  if (/authorization|sponsor|eligib|non.?compete|conflict of interest|clearance|criminal/.test(value)) return "LEGAL";
  if (/why .*(role|company)|describe.*experience|additional information/.test(value)) return "GENERATED_TEXT";
  if (/name|email|phone|location|linkedin|portfolio|resume|cover letter/.test(value)) return "SAFE_PROFILE";
  if (/salary|start date|relocat|remote|hybrid/.test(value)) return "SAVED_USER_ANSWER";
  return "UNKNOWN";
}
function scanFields(): ReviewField[] {
  return [...document.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>("input,select,textarea")].filter(el=>el.type!=="hidden"&&el.type!=="submit"&&el.type!=="button").map((el,index)=>{
    const label=labelFor(el), classification=classify(label), file=el instanceof HTMLInputElement&&el.type==="file";
    const filled=file?Boolean(el.files?.length):(el instanceof HTMLInputElement&&(el.type==="checkbox"||el.type==="radio")?el.checked:Boolean(el.value.trim()));
    const manuallyApproved=el.dataset.jobpilotApproved==="true";
    return {id:el.id||el.name||`field-${index}`,fieldType:label.slice(0,80)||"UNKNOWN",classification,required:el.required,filled,source:file?"document":manuallyApproved?"user":filled?"profile":undefined,approved:classification==="LEGAL"||classification==="GENERATED_TEXT"?manuallyApproved:undefined,confidence:classification==="UNKNOWN"?.3:.9};
  });
}
function detectSubmitControl(): HTMLButtonElement|HTMLInputElement|null {
  const controls=[...document.querySelectorAll<HTMLButtonElement|HTMLInputElement>('button,input[type="submit"]')];
  const allowed=/^(submit application|send application|apply)$/i, denied=/^(save|continue|next|sign up|subscribe|login)$/i;
  return controls.find(control=>{const text=(control instanceof HTMLInputElement?control.value:control.innerText).trim();return allowed.test(text)&&!denied.test(text);})??null;
}
function currentReview(sessionId:string,app:ApplicationData){const detection=detectAts();return{sessionId,atsType:detection.atsType,employer:app.application.job.companies.name,job:app.application.job.title,fields:scanFields(),captcha:Boolean(document.querySelector('[class*="captcha" i],[id*="captcha" i],iframe[src*="captcha" i]')),loginRequired:/sign in|log in/i.test(document.body.innerText)&&Boolean(document.querySelector('input[type="password"]')),mfaRequired:/verification code|multi-factor|two-factor/i.test(document.body.innerText),validationErrors:[...document.querySelectorAll<HTMLElement>('[aria-invalid="true"],.error,.field-error')].filter(e=>e.offsetParent!==null).map(e=>e.innerText.slice(0,300)).filter(Boolean),documentVersions:app.documents.versions};}

async function initialize(){const extensionSession=await send<SessionState|null>({type:"GET_SESSION"});if(!extensionSession)return;const applicationResult=await send<ApiResult<ApplicationData>>({type:"API",path:"/api/extension/application"});const app=applicationResult.data;if(!applicationResult.ok||!app)return;const detection=detectAts();const sessionResult=await send<ApiResult<{id:string}>>({type:"API",path:"/api/automation/session",method:"POST",body:{atsType:detection.atsType}});if(!sessionResult.ok||!sessionResult.data)return;const sessionId=sessionResult.data.id;
  const panel=document.createElement("section");panel.id="jobpilot-submit-review";panel.style.cssText="position:fixed;right:16px;bottom:16px;z-index:2147483647;width:340px;background:white;border:2px solid #5b5bd6;border-radius:14px;padding:14px;box-shadow:0 18px 50px #0003;font:13px Arial;color:#27272a";
  panel.innerHTML='<b style="font-size:16px">Controlled submission</b><p id="jp-submit-state">Scan and validate this exact form before approving.</p><button id="jp-final-review" style="width:100%;padding:9px">Open final review</button><div id="jp-approval" hidden><label style="display:flex;gap:8px;margin:12px 0"><input id="jp-confirm-specific" type="checkbox">I reviewed this application and authorize JobPilot to submit this specific application.</label><button id="jp-submit-specific" disabled style="width:100%;padding:9px;background:#5b5bd6;color:white;border:0;border-radius:8px">Submit application</button></div>';
  document.documentElement.append(panel);const state=panel.querySelector<HTMLElement>("#jp-submit-state")!,reviewButton=panel.querySelector<HTMLButtonElement>("#jp-final-review")!,approval=panel.querySelector<HTMLElement>("#jp-approval")!,checkbox=panel.querySelector<HTMLInputElement>("#jp-confirm-specific")!,submitButton=panel.querySelector<HTMLButtonElement>("#jp-submit-specific")!;let formHash="",approvalToken="";
  reviewButton.onclick=async()=>{const review=currentReview(sessionId,app);const result=await send<ApiResult<{ready:boolean;errors:string[];formHash:string;testMode:boolean}>>({type:"API",path:"/api/automation/review",method:"POST",body:review});if(!result.ok||!result.data){state.textContent="Review could not be created.";return;}formHash=result.data.formHash;state.textContent=result.data.ready?`Ready for final review${result.data.testMode?" — test mode is ON":""}`:`Requires attention: ${result.data.errors.join(", ")}`;approval.hidden=!result.data.ready;checkbox.checked=false;submitButton.disabled=true;};
  checkbox.onchange=()=>{submitButton.disabled=!checkbox.checked;};
  submitButton.onclick=async()=>{if(!checkbox.checked||!formHash)return;const approved=await send<ApiResult<{approvalToken:string;testMode:boolean}>>({type:"API",path:"/api/automation/approve",method:"POST",body:{sessionId,formHash,confirmed:true}});if(!approved.ok||!approved.data){state.textContent="Approval expired or the form changed. Review again.";return;}approvalToken=approved.data.approvalToken;const review=currentReview(sessionId,app);const permit=await send<ApiResult<{permitted:boolean;message?:string}>>({type:"API",path:"/api/automation/submit",method:"POST",body:{approvalToken,formHash,review}});if(!permit.ok||!permit.data?.permitted){state.textContent=permit.data?.message??"Submission was prevented. Review the form again.";return;}const control=detectSubmitControl();if(!control){state.textContent="Submit control not found. Submit manually or review the form.";return;}state.textContent="Submitting once with your fresh approval…";control.click();};
  const confirmation=/application (?:has been )?(?:submitted|received)|thank you for applying/i.test(document.body.innerText);
  if(confirmation&&window.confirm("JobPilot detected a possible confirmation. Confirm this application was submitted?")){const result=await send<ApiResult<{ok:boolean}>>({type:"API",path:"/api/automation/confirmation",method:"POST",body:{sessionId,userConfirmed:true,confidence:"MEDIUM",confirmationText:document.querySelector("h1")?.textContent?.slice(0,500),confirmationUrl:location.href}});if(result.ok)state.textContent="Submission confirmed and receipt saved in JobPilot.";}
}
void initialize();
