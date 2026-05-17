"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Book {
  id: string;
  title: string;
  coverUrl: string | null;
  authors: Array<{ author: { name: string } }>;
}

interface UserBook {
  bookId: string;
  status: string;
  book: Book;
}

interface AddSuggestionProps {
  clubId: string;
  existingBookIds: string[];
}

const STATUS_LABEL: Record<string, string> = {
  READING: "Reading",
  WANT_TO_READ: "Want to read",
};

export function AddSuggestion({ clubId, existingBookIds }: AddSuggestionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<UserBook[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/user/reading-list?statuses=WANT_TO_READ,READING")
      .then((r) => r.json())
      .then((data: UserBook[]) =>
        setBooks(data.filter((ub) => !existingBookIds.includes(ub.bookId)))
      )
      .catch(() => {});
  }, [existingBookIds]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const suggest = async (bookId: string) => {
    setAdding(bookId);
    try {
      const res = await fetch(`/api/clubs/${clubId}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (res.ok) {
        setAdded((prev) => new Set([...prev, bookId]));
        router.refresh();
      }
    } finally {
      setAdding(null);
    }
  };

  const visibleBooks = books.filter((ub) => !added.has(ub.bookId));

  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="secondary" onClick={() => setOpen((o) => !o)}>
        + Add suggestion
      </Button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          {visibleBooks.length > 0 ? (
            <>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                From your shelf
              </p>
              <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                {visibleBooks.map((ub) => {
                  const authors = [...new Set(ub.book.authors.map((a) => a.author.name))].join(", ");
                  return (
                    <li key={ub.bookId} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="relative h-12 w-8 shrink-0 overflow-hidden rounded bg-gray-100">
                        {ub.book.coverUrl ? (
                          <Image src={ub.book.coverUrl} alt={ub.book.title} fill className="object-cover" sizes="32px" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm">📚</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{ub.book.title}</p>
                        {authors && <p className="truncate text-xs text-gray-400">{authors}</p>}
                        <p className="text-xs text-gray-400">{STATUS_LABEL[ub.status] ?? ub.status}</p>
                      </div>
                      <button
                        onClick={() => suggest(ub.bookId)}
                        disabled={adding === ub.bookId}
                        className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {adding === ub.bookId ? "…" : "Suggest"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="px-4 py-4 text-sm text-gray-400">No books from your shelf to suggest.</p>
          )}
          <div className="border-t border-gray-100 px-4 py-3">
            <Link
              href={`/search?clubId=${clubId}`}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Search all books →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
