import { db } from "@/lib/db";
import * as openLibrary from "./open-library";
import * as googleBooks from "./google-books";
import type { BookSearchResult, BookWithAuthors } from "@/types";

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const results = await openLibrary.searchBooks(query, 20);
    if (results.length > 0) return results;
  } catch {
    // fall through to Google Books
  }
  return googleBooks.searchBooks(query, 20);
}

export async function upsertBook(result: BookSearchResult): Promise<BookWithAuthors> {
  const { openLibraryWorkId, googleBooksId, title, subtitle, description, coverUrl, firstPublishYear, authors, isbn13, isbn10, publisher, pageCount, language } = result;

  const book = await db.book.upsert({
    where: openLibraryWorkId
      ? { openLibraryWorkId }
      : googleBooksId
      ? { googleBooksId }
      : { id: "never-match" },
    create: {
      title,
      subtitle,
      description,
      coverUrl,
      firstPublishYear,
      openLibraryWorkId,
      googleBooksId,
    },
    update: {
      title,
      subtitle,
      description: description ?? undefined,
      coverUrl: coverUrl ?? undefined,
      firstPublishYear: firstPublishYear ?? undefined,
    },
    include: { authors: { include: { author: true } }, editions: true },
  });

  // Upsert authors
  for (const authorName of authors) {
    const author = await db.author.upsert({
      where: { openLibraryAuthorId: authorName },
      create: { name: authorName },
      update: { name: authorName },
    });
    await db.bookAuthor.upsert({
      where: { bookId_authorId: { bookId: book.id, authorId: author.id } },
      create: { bookId: book.id, authorId: author.id },
      update: {},
    });
  }

  // Upsert edition if we have ISBN data
  if (isbn13 || isbn10) {
    await db.edition.upsert({
      where: { id: book.editions[0]?.id ?? "new" },
      create: { bookId: book.id, isbn13, isbn10, publisher, pageCount, language },
      update: { isbn13: isbn13 ?? undefined, isbn10: isbn10 ?? undefined, publisher: publisher ?? undefined, pageCount: pageCount ?? undefined },
    });
  }

  return db.book.findUniqueOrThrow({
    where: { id: book.id },
    include: { authors: { include: { author: true } }, editions: true },
  });
}

export async function getBookById(id: string): Promise<BookWithAuthors | null> {
  return db.book.findUnique({
    where: { id },
    include: { authors: { include: { author: true } }, editions: true },
  });
}
