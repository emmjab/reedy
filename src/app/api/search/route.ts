import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/api/book-metadata";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const results = await searchBooks(query);
  return NextResponse.json(results);
}
