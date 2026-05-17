import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BookWithAuthors, UserBook } from "@/types";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" }> = {
  WANT_TO_READ: { label: "Want to Read", variant: "info" },
  READING: { label: "Reading", variant: "warning" },
  READ: { label: "Finished", variant: "success" },
  ABANDONED: { label: "Abandoned", variant: "default" },
};

const RATING_LABELS: Record<string, string> = {
  GREAT: "great!",
  GOOD: "good",
  OK: "ok",
  MEH: "meh",
  NAH: "nah",
};

interface BookCardProps {
  book: BookWithAuthors;
  userBook?: UserBook | null;
}

export function BookCard({ book, userBook }: BookCardProps) {
  const authorNames = [...new Set(book.authors.map((ba) => ba.author.name))].join(", ");
  const statusInfo = userBook ? STATUS_LABELS[userBook.status] : null;
  const ratingLabel = userBook?.rating ? RATING_LABELS[userBook.rating] : null;

  return (
    <Link href={`/books/${book.id}`} className="group flex gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
        {book.coverUrl ? (
          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="80px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <p className="font-semibold text-gray-900 line-clamp-2 group-hover:text-brand-600">{book.title}</p>
          {authorNames && <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{authorNames}</p>}
          {book.firstPublishYear && <p className="mt-0.5 text-xs text-gray-400">{book.firstPublishYear}</p>}
        </div>
        <div className="flex items-center gap-2">
          {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
          {ratingLabel && <span className="text-xs text-gray-500 italic">{ratingLabel}</span>}
        </div>
      </div>
    </Link>
  );
}
