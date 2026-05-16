import type {
  Book,
  Author,
  Edition,
  UserBook,
  BookClub,
  BookClubMember,
  BookClubBook,
  ClubDiscussion,
  ClubComment,
  LibraryAvailability,
  ReadingStatus,
  ClubRole,
  LibrarySystem,
  AvailabilityStatus,
} from "@prisma/client";

export type {
  Book,
  Author,
  Edition,
  UserBook,
  BookClub,
  BookClubMember,
  BookClubBook,
  ClubDiscussion,
  ClubComment,
  LibraryAvailability,
  ReadingStatus,
  ClubRole,
  LibrarySystem,
  AvailabilityStatus,
};

// ── External API types ────────────────────────────────────────────────────

export interface BookSearchResult {
  openLibraryWorkId?: string;
  googleBooksId?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  coverUrl?: string;
  firstPublishYear?: number;
  isbn13?: string;
  isbn10?: string;
  publisher?: string;
  pageCount?: number;
  language?: string;
  source: "open_library" | "google_books";
}

export interface OpenLibraryWork {
  key: string;
  title: string;
  subtitle?: string;
  description?: string | { value: string };
  covers?: number[];
  first_publish_year?: number;
  author_name?: string[];
  isbn?: string[];
}

export interface OpenLibraryEdition {
  key: string;
  title: string;
  isbn_13?: string[];
  isbn_10?: string[];
  publishers?: string[];
  publish_date?: string;
  number_of_pages?: number;
  languages?: Array<{ key: string }>;
}

export interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    publishedDate?: string;
    publisher?: string;
    pageCount?: number;
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
    language?: string;
  };
}

// ── Enriched response types ───────────────────────────────────────────────

export type BookWithAuthors = Book & {
  authors: Array<{ author: Author }>;
  editions: Edition[];
};

export type BookWithAvailability = BookWithAuthors & {
  availability: LibraryAvailability[];
};

export type UserBookWithBook = UserBook & {
  book: BookWithAuthors;
};

export type BookClubWithDetails = BookClub & {
  members: Array<BookClubMember & { user: { id: string; name: string | null; image: string | null } }>;
  books: Array<BookClubBook & { book: BookWithAuthors }>;
  _count: { members: number; books: number; discussions: number };
};

export type ClubDiscussionWithDetails = ClubDiscussion & {
  user: { id: string; name: string | null; image: string | null };
  comments: Array<ClubComment & { user: { id: string; name: string | null; image: string | null } }>;
  _count: { comments: number };
};

// ── Library availability ──────────────────────────────────────────────────

export interface LibraryAvailabilityResult {
  system: LibrarySystem;
  format: string;
  status: AvailabilityStatus;
  holdCount?: number;
  estimatedWaitDays?: number;
  sourceUrl?: string;
}

// ── API responses ─────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

export type ApiResponse<T> = T | ApiError;
