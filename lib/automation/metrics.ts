import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getSubmissionMetrics() {
  const db=createAdminClient();
  const [{data:sessions},{data:receipts},{data:snapshots}]=await Promise.all([
    db.from("application_sessions").select("ats_type,status,failure_code"),
    db.from("application_receipts").select("ats_type"),
    db.from("application_form_snapshots").select("field_summary"),
  ]);
  const attempts=sessions?.length??0,successfulConfirmations=receipts?.length??0;
  const failuresByReason:Record<string,number>={},failuresByAts:Record<string,number>={};
  for(const item of sessions??[]){if(item.failure_code)failuresByReason[item.failure_code]=(failuresByReason[item.failure_code]??0)+1;if(item.status==="FAILED")failuresByAts[item.ats_type]=(failuresByAts[item.ats_type]??0)+1;}
  const fields=(snapshots??[]).flatMap(row=>Array.isArray(row.field_summary)?row.field_summary:[]);
  return{attempts,successfulConfirmations,needsUserAction:(sessions??[]).filter(s=>s.status==="WAITING_FOR_USER").length,failuresByAts,failuresByReason,averageFieldsDetected:snapshots?.length?fields.length/snapshots.length:0,averageFieldsAutoFilled:snapshots?.length?fields.filter((f:unknown)=>typeof f==="object"&&f!==null&&"source"in f&&["profile","saved_answer","document"].includes(String((f as {source:unknown}).source))).length/snapshots.length:0};
}
