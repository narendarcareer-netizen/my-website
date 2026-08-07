"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";

export function ResumeUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function upload(file: File) {
    if (!/\.(pdf|docx)$/i.test(file.name) || !["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) {
      setStatus("error"); setMessage("Choose a PDF or DOCX file."); return;
    }
    if (file.size > 5 * 1024 * 1024) { setStatus("error"); setMessage("The file must be 5 MB or smaller."); return; }
    const body = new FormData(); body.append("resume", file);
    const request = new XMLHttpRequest();
    request.open("POST", "/api/resumes");
    request.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => {
      let result: { error?: string } = {};
      try { result = JSON.parse(request.responseText) as { error?: string }; } catch { result = {}; }
      if (request.status >= 200 && request.status < 300) { setStatus("success"); setMessage("Résumé uploaded securely."); setProgress(100); router.refresh(); }
      else { setStatus("error"); setMessage(result.error ?? "Upload failed. Please try again."); }
    };
    request.onerror = () => { setStatus("error"); setMessage("Network error. Check your connection and try again."); };
    setStatus("uploading"); setMessage(""); setProgress(0); request.send(body);
  }

  return <div><input ref={input} className="sr-only" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => { const file = event.target.files?.[0]; if (file) upload(file); }} /><button type="button" disabled={status === "uploading"} onClick={() => input.current?.click()} className="button-secondary"><FileUp className="size-4" />{status === "uploading" ? `Uploading ${progress}%` : "Upload résumé"}</button>{status === "uploading" && <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100" aria-label={`Upload ${progress}% complete`}><div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${progress}%` }} /></div>}{message && <p role={status === "error" ? "alert" : "status"} className={`mt-3 text-sm ${status === "error" ? "text-rose-600" : "text-emerald-600"}`}>{message}</p>}<p className="mt-2 text-xs text-zinc-400">PDF or DOCX, up to 5 MB. Files remain private.</p></div>;
}
