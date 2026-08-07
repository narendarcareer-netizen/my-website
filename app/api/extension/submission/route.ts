import { NextResponse } from "next/server";
import { extensionCors } from "@/lib/extension/session";

export function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: extensionCors(request) }); }

export async function POST(request: Request) {
  return NextResponse.json(
    { error: "LEGACY_SUBMISSION_DISABLED", message: "Use the controlled review, approval, submission, and confirmation flow." },
    { status: 410, headers: extensionCors(request) },
  );
}
