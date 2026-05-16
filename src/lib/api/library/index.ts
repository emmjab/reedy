import { db } from "@/lib/db";
import { checkBplAvailability } from "./bpl";
import { checkNyplAvailability } from "./nypl";
import { bestIsbn } from "@/lib/utils/isbn";
import type { LibraryAvailabilityResult } from "@/types";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function getAvailability(bookId: string): Promise<LibraryAvailabilityResult[]> {
  const book = await db.book.findUnique({
    where: { id: bookId },
    include: { editions: true, availability: true },
  });
  if (!book) return [];

  // Return cached data if fresh
  const mostRecent = book.availability.sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())[0];
  if (mostRecent && Date.now() - mostRecent.checkedAt.getTime() < CACHE_TTL_MS) {
    return book.availability.map((a) => ({
      system: a.librarySystem,
      format: a.format,
      status: a.availabilityStatus,
      holdCount: a.holdCount ?? undefined,
      estimatedWaitDays: a.estimatedWaitDays ?? undefined,
      sourceUrl: a.sourceUrl ?? undefined,
    }));
  }

  // Find an ISBN to check against
  const edition = book.editions.find((e) => e.isbn13 || e.isbn10) ?? book.editions[0];
  const isbn = edition ? bestIsbn(edition.isbn10, edition.isbn13) : null;
  if (!isbn) return [];

  // Fetch fresh availability from both systems in parallel
  const [bplResults, nyplResults] = await Promise.all([
    checkBplAvailability(isbn).catch(() => [] as LibraryAvailabilityResult[]),
    checkNyplAvailability(isbn).catch(() => [] as LibraryAvailabilityResult[]),
  ]);

  const allResults = [...bplResults, ...nyplResults];

  // Persist to database
  await Promise.all(
    allResults.map((r) =>
      db.libraryAvailability.upsert({
        where: { bookId_librarySystem_format: { bookId, librarySystem: r.system, format: r.format } },
        create: {
          bookId,
          editionId: edition?.id,
          librarySystem: r.system,
          format: r.format,
          availabilityStatus: r.status,
          holdCount: r.holdCount,
          estimatedWaitDays: r.estimatedWaitDays,
          sourceUrl: r.sourceUrl,
        },
        update: {
          availabilityStatus: r.status,
          holdCount: r.holdCount ?? null,
          estimatedWaitDays: r.estimatedWaitDays ?? null,
          sourceUrl: r.sourceUrl ?? null,
          checkedAt: new Date(),
        },
      })
    )
  );

  return allResults;
}

export async function refreshStaleAvailability(): Promise<number> {
  const staleThreshold = new Date(Date.now() - CACHE_TTL_MS);

  // Find books that have stale or missing availability and are on someone's list
  const booksNeedingRefresh = await db.book.findMany({
    where: {
      userBooks: { some: {} },
      OR: [
        { availability: { none: {} } },
        { availability: { every: { checkedAt: { lt: staleThreshold } } } },
      ],
    },
    include: { editions: true },
    take: 50,
  });

  let refreshed = 0;
  for (const book of booksNeedingRefresh) {
    try {
      await getAvailability(book.id);
      refreshed++;
    } catch {
      // continue with next book
    }
  }
  return refreshed;
}
