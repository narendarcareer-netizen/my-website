import PDFDocument from "pdfkit";
import type { ResumeAnalysis } from "@/lib/ai/types";

interface Edit { original: string; suggested: string; manualText?: string | null; decision: string }

function finish(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => { const chunks: Buffer[] = []; doc.on("data", chunk => chunks.push(Buffer.from(chunk))); doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); doc.end(); });
}

function heading(doc: PDFKit.PDFDocument, text: string) { doc.moveDown(.7).font("Helvetica-Bold").fontSize(11).fillColor("#17171c").text(text.toUpperCase()).moveDown(.25); }

export async function generateResumePdf(analysis: ResumeAnalysis, edits: Edit[]) {
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 46, bottom: 46, left: 54, right: 54 }, info: { Title: "Tailored Resume", Author: analysis.contact.name ?? "JobPilot user" } });
  const replacements = new Map(edits.filter(edit => edit.decision === "accepted").map(edit => [edit.original.trim(), (edit.manualText || edit.suggested).trim()]));
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#17171c").text(analysis.contact.name ?? "Resume");
  const contact = [analysis.contact.location, analysis.contact.email, analysis.contact.phone, analysis.contact.linkedin, analysis.contact.portfolio].filter(Boolean).join(" | "); if (contact) doc.moveDown(.25).font("Helvetica").fontSize(9).fillColor("#55555f").text(contact);
  if (analysis.summary) { heading(doc, "Summary"); doc.font("Helvetica").fontSize(10).fillColor("#25252b").text(analysis.summary, { lineGap: 2 }); }
  if (analysis.skills.length) { heading(doc, "Skills"); doc.font("Helvetica").fontSize(10).text(analysis.skills.join(", "), { lineGap: 2 }); }
  if (analysis.experience.length) { heading(doc, "Experience"); for (const item of analysis.experience) { doc.font("Helvetica-Bold").fontSize(10.5).text([item.title, item.company].filter(Boolean).join(" - ")); const dates = [item.startDate, item.endDate].filter(Boolean).join(" - "); if (dates) doc.font("Helvetica").fontSize(9).fillColor("#66666f").text(dates); for (const bullet of item.bullets) doc.font("Helvetica").fontSize(9.5).fillColor("#25252b").text(`- ${replacements.get(bullet.trim()) ?? bullet}`, { indent: 10, lineGap: 2 }); doc.moveDown(.35); } }
  if (analysis.education.length) { heading(doc, "Education"); for (const item of analysis.education) { doc.font("Helvetica-Bold").fontSize(10).text([item.degree, item.field].filter(Boolean).join(" in ")); doc.font("Helvetica").fontSize(9.5).text([item.institution, item.startDate && item.endDate ? `${item.startDate} - ${item.endDate}` : item.endDate].filter(Boolean).join(" | ")); } }
  if (analysis.certifications.length) { heading(doc, "Certifications"); analysis.certifications.forEach(item => doc.font("Helvetica").fontSize(9.5).text(`- ${item}`)); }
  return finish(doc);
}

export async function generateTextDocumentPdf(title: string, text: string) {
  const doc = new PDFDocument({ size: "LETTER", margins: { top: 54, bottom: 54, left: 62, right: 62 }, info: { Title: title } });
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#17171c").text(title).moveDown(1); doc.font("Helvetica").fontSize(11).fillColor("#25252b").text(text, { lineGap: 5 }); return finish(doc);
}
