import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { upsertBook } from "@/lib/api/book-metadata";
import type { BookSearchResult } from "@/types";

const schema = z.object({
  openLibraryWorkId: z.string().optional(),
  googleBooksId: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  authors: z.array(z.string()),
  description: z.string().optional(),
  coverUrl: z.string().url().optional(),
  firstPublishYear: z.number().int().optional(),
  isbn13: z.string().optional(),
  isbn10: z.string().optional(),
  publisher: z.string().optional(),
  pageCount: z.number().int().optional(),
  language: z.string().optional(),
  source: z.enum(["open_library", "google_books"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const book = await upsertBook(parsed.data as BookSearchResult);
  return NextResponse.json(book, { status: 201 });
}
