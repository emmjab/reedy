import type { BookSearchResult, GoogleBooksVolume } from "@/types";

const BASE = "https://www.googleapis.com/books/v1";

function volumeToResult(vol: GoogleBooksVolume): BookSearchResult {
  const info = vol.volumeInfo;
  const isbn13 = info.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier;
  const isbn10 = info.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier;

  const rawThumbnail = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  const coverUrl = rawThumbnail?.replace("http://", "https://").replace("&zoom=1", "&zoom=2");

  return {
    googleBooksId: vol.id,
    title: info.title,
    subtitle: info.subtitle,
    authors: info.authors ?? [],
    description: info.description,
    coverUrl,
    firstPublishYear: info.publishedDate ? parseInt(info.publishedDate) : undefined,
    isbn13,
    isbn10,
    publisher: info.publisher,
    pageCount: info.pageCount,
    language: info.language,
    source: "google_books" as const,
  };
}

export async function searchBooks(query: string, limit = 20): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(limit), printType: "books" });
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set("key", process.env.GOOGLE_BOOKS_API_KEY);

  const res = await fetch(`${BASE}/volumes?${params}`, { next: { revalidate: 300 } });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map(volumeToResult);
}

export async function getVolume(volumeId: string): Promise<BookSearchResult | null> {
  const params = new URLSearchParams();
  if (process.env.GOOGLE_BOOKS_API_KEY) params.set("key", process.env.GOOGLE_BOOKS_API_KEY);

  const res = await fetch(`${BASE}/volumes/${volumeId}?${params}`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;

  const vol: GoogleBooksVolume = await res.json();
  return volumeToResult(vol);
}

export async function searchByIsbn(isbn: string): Promise<BookSearchResult | null> {
  const results = await searchBooks(`isbn:${isbn}`, 1);
  return results[0] ?? null;
}
