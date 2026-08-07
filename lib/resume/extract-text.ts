import "server-only";
import mammoth from "mammoth";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 50_000;

export class ResumeExtractionError extends Error {}

export async function extractResumeText(fileName: string, data: ArrayBuffer) {
  if (data.byteLength > MAX_FILE_BYTES) throw new ResumeExtractionError("The résumé must be 5 MB or smaller.");
  const buffer = Buffer.from(data); let text = "";
  if (/\.pdf$/i.test(fileName)) {
    // Load PDF.js only while analyzing a PDF so its Node initialization is
    // not evaluated as part of the React Server Component page bundle.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
  } else if (/\.docx$/i.test(fileName)) {
    text = (await mammoth.extractRawText({ buffer })).value;
  } else throw new ResumeExtractionError("Only PDF and DOCX résumés are supported.");
  const cleaned = text.replace(/\0/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (!cleaned) throw new ResumeExtractionError("No readable text was found in this résumé.");
  return cleaned.slice(0, MAX_TEXT_CHARS);
}
