# Gemini application-document preparation

JobPilot Phase 5 analyzes private resumes and prepares job-specific documents with Google's Gemini API. All Gemini requests originate in server-only modules. The browser never receives the API key, private resume file, or privileged Supabase key.

## Setup

1. In Supabase, open **SQL Editor**, create a new query, paste all of `supabase/migrations/202608070004_ai_documents.sql`, and run it once.
2. Create a Gemini API key in Google AI Studio.
3. Add this line to the root `.env.local` file (beside `package.json`):

   ```env
   GEMINI_API_KEY=your_key_here
   ```

4. Never prefix this variable with `NEXT_PUBLIC_`. Restart `npm.cmd run dev` after changing environment variables.

The project uses Google's official `@google/genai` package and the stable `gemini-3.5-flash` model. `lib/gemini/client.ts` is the single client entry point. It requests JSON output with a JSON schema, then independently validates the response with Zod.

## Data and approval flow

The migration creates four private tables:

- `resume_analyses` stores extracted text and validated structured resume data.
- `job_document_drafts` stores resume suggestions, cover letters, application summaries, verified source facts, and model metadata.
- `document_versions` preserves edits and regenerations.
- `ai_usage` stores operation, model, token counts, and an estimated-cost placeholder. Cost remains zero because live Gemini pricing should not be hard-coded into application logic.

Row Level Security limits reads and normal writes to the signed-in owner. Usage insertion and AI generation use trusted server code. An approved document is separate from the uploaded original; JobPilot never overwrites the original resume.

## Resume extraction

`lib/resume/extract-text.ts` downloads the user's private resume on the server. It extracts PDF text with `pdf-parse` and DOCX text with `mammoth`. Files are limited to 5 MB and extracted input is capped before it is sent to Gemini. Empty, unsupported, and unreadable documents return safe user-facing errors.

The structured resume contains contact fields, summary, skills, experience, education, and certifications. Uncertain fields must be `null` or omitted from lists. Original extracted text is retained for fact checks and review.

## Fact grounding and prompt-injection protection

Every generation includes a minimized `source_facts` object built from the user's profile and resume. The system instruction says that only those facts may be used and that unsupported requirements must be shown as gaps. Job descriptions are wrapped and treated as untrusted data; instructions inside a job description cannot change application behavior.

Gemini output is validated in three layers:

1. JSON-schema-constrained model output.
2. Zod validation on the server.
3. Deterministic grounding checks that require each suggested edit's original text and cited fact to exist, and reject new unsupported numbers or metrics.

Users review each suggestion and can accept, reject, or manually edit it. Cover letters can be edited, versioned, approved, or rejected. Only approved resume and cover-letter drafts can be exported as clean, single-column PDFs.

## Limits and failures

Current per-user, per-server-instance hourly limits are five resume analyses, ten document generations, and five regenerations. The centralized client caps prompt size, uses a 45-second timeout, retries temporary failures up to three times, and returns safe errors. It never logs API keys, resume text, tokens, or personal facts.

For production across multiple server instances, replace the in-memory limiter with a shared durable limiter such as a database or Redis counter.

## Test with a Figma job

1. Sign in and upload a real PDF or DOCX at `/profile`; mark it primary if you have multiple resumes.
2. Open `/jobs`, choose one imported Figma job, and click **Prepare Application**.
3. Select the resume and click **Analyze & prepare**.
4. Review the match, parsed resume, strengths, gaps, suggested edits, cover letter, and application summary.
5. Reject any sentence that is not supported by the original text. Accept or manually edit supported suggestions.
6. Save and explicitly approve the final resume suggestions and cover letter.
7. Download buttons appear only for approved documents.

To verify grounding, compare every added statement with the displayed original resume and source fact. Search for new employers, degrees, certifications, dates, skills, achievements, and numbers. Any unsupported item is a defect: reject it and do not approve the draft.

Run local verification with:

```powershell
npm.cmd exec tsc -- --noEmit
npm.cmd run lint
npm.cmd run test:ai-safety
npm.cmd run build
```

The safety test rejects synthetic unsupported AWS experience and a fabricated 40% metric, then creates an ATS-friendly sample PDF in `tmp/pdfs` for visual inspection.
