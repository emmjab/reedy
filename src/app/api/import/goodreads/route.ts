import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { upsertBook } from "@/lib/api/book-metadata";
import { searchBooks } from "@/lib/api/open-library";
import { ReadingStatus, BookRating } from "@prisma/client";

const rowSchema = z.object({
  title: z.string().min(1),
  author: z.string(),
  isbn13: z.string().optional(),
  isbn10: z.string().optional(),
  status: z.nativeEnum(ReadingStatus),
  rating: z.nativeEnum(BookRating).nullable(),
  dateRead: z.string().nullable(),
});

const schema = z.array(rowSchema);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const userId = session.user.id!;
  let imported = 0;
  let failed = 0;

  for (const row of parsed.data) {
    try {
      // Search by ISBN first, then fall back to title + author
      const query = row.isbn13 || row.isbn10 || `${row.title} ${row.author}`;
      const results = await searchBooks(query, 3);
      const result = results[0];
      if (!result) { failed++; continue; }

      const book = await upsertBook(result);

      await db.userBook.upsert({
        where: { userId_bookId: { userId, bookId: book.id } },
        create: {
          userId,
          bookId: book.id,
          status: row.status,
          rating: row.rating,
          finishedAt: row.status === "READ" && row.dateRead ? new Date(row.dateRead) : undefined,
        },
        update: {
          status: row.status,
          rating: row.rating,
          finishedAt: row.status === "READ" && row.dateRead ? new Date(row.dateRead) : undefined,
        },
      });

      imported++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ imported, failed });
}
