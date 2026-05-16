import type { BookSearchResult, OpenLibraryWork, OpenLibraryEdition } from "@/types";

const BASE = "https://openlibrary.org";
const COVERS = "https://covers.openlibrary.org";

function coverUrl(coverId: number, size: "S" | "M" | "L" = "M"): string {
  return `${COVERS}/b/id/${coverId}-${size}.jpg`;
}

function extractDescription(work: OpenLibraryWork): string | undefined {
  if (!work.description) return undefined;
  if (typeof work.description === "string") return work.description;
  return work.description.value;
}

export async function searchBooks(query: string, limit = 20): Promise<BookSearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(limit), fields: "key,title,subtitle,author_name,first_publish_year,cover_i,isbn,language" });
  const res = await fetch(`${BASE}/search.json?${params}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Open Library search failed: ${res.status}`);

  const data = await res.json();
  return (data.docs ?? []).map((doc: OpenLibraryWork & { cover_i?: number; author_name?: string[]; isbn?: string[] }) => {
    const isbn13 = doc.isbn?.find((i) => i.length === 13);
    const isbn10 = doc.isbn?.find((i) => i.length === 10);
    return {
      openLibraryWorkId: doc.key?.replace("/works/", ""),
      title: doc.title,
      subtitle: doc.subtitle,
      authors: doc.author_name ?? [],
      coverUrl: doc.cover_i ? coverUrl(doc.cover_i) : undefined,
      firstPublishYear: doc.first_publish_year,
      isbn13,
      isbn10,
      source: "open_library" as const,
    };
  });
}

export async function getWork(workId: string): Promise<OpenLibraryWork | null> {
  const res = await fetch(`${BASE}/works/${workId}.json`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

export async function getEditionsByIsbn(isbn: string): Promise<OpenLibraryEdition | null> {
  const res = await fetch(`${BASE}/isbn/${isbn}.json`, { next: { revalidate: 3600 } });
  if (!res.ok) return null;
  return res.json();
}

export async function getEditionsForWork(workId: string, limit = 10): Promise<OpenLibraryEdition[]> {
  const res = await fetch(`${BASE}/works/${workId}/editions.json?limit=${limit}`, { next: { revalidate: 3600 } });
  if (!res.ok) return [];
  const data = await res.json();
  return data.entries ?? [];
}

export async function enrichFromOpenLibrary(workId: string): Promise<Partial<BookSearchResult> | null> {
  const work = await getWork(workId);
  if (!work) return null;

  const authorNames: string[] = [];
  if (Array.isArray((work as any).authors)) {
    await Promise.all(
      (work as any).authors.slice(0, 5).map(async (a: { author: { key: string } }) => {
        const authorKey = a.author?.key?.replace("/authors/", "");
        if (!authorKey) return;
        const res = await fetch(`${BASE}/authors/${authorKey}.json`, { next: { revalidate: 86400 } });
        if (res.ok) {
          const authorData = await res.json();
          if (authorData.name) authorNames.push(authorData.name);
        }
      })
    );
  }

  const editions = await getEditionsForWork(workId, 5);
  const bestEdition = editions.find((e) => e.isbn_13?.length) ?? editions[0];

  return {
    openLibraryWorkId: workId,
    title: work.title,
    subtitle: work.subtitle,
    description: extractDescription(work),
    coverUrl: (work.covers?.[0]) ? coverUrl(work.covers[0]) : undefined,
    firstPublishYear: work.first_publish_year,
    authors: authorNames,
    isbn13: bestEdition?.isbn_13?.[0],
    isbn10: bestEdition?.isbn_10?.[0],
    publisher: bestEdition?.publishers?.[0],
    pageCount: bestEdition?.number_of_pages,
    source: "open_library" as const,
  };
}
