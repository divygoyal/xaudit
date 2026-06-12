import { NextResponse } from "next/server";
import { fetchMatches } from "@/lib/live";

export const runtime = "nodejs";
export const revalidate = 30;

export async function GET() {
  try {
    const result = await fetchMatches();
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "fetch_failed" },
      { status: 502 },
    );
  }
}
