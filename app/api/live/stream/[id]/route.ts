import { NextRequest, NextResponse } from "next/server";
import { resolveStream } from "@/lib/live";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const id = decodeURIComponent(params.id);
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }
  const resolved = await resolveStream(id);
  if (!resolved) {
    return NextResponse.json({ error: "no_stream", id }, { status: 404 });
  }
  return NextResponse.json(resolved);
}
