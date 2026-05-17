"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookSearch } from "@/components/books/BookSearch";
import type { BookSearchResult } from "@/types";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clubId = searchParams.get("clubId");
  const [selected, setSelected] = useState<BookSearchResult | null>(null);
  const [existingExternalIds, setExistingExternalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!clubId) return;
    fetch(`/api/clubs/${clubId}/books`)
      .then((r) => r.json())
      .then((ids: string[]) => setExistingExternalIds(new Set(ids)))
      .catch(() => {});
  }, [clubId]);

  const handleSelect = async (result: BookSearchResult) => {
    setSelected(result);
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (res.ok) {
      const book = await res.json();
      router.push(`/books/${book.id}${clubId ? `?clubId=${clubId}` : ""}`);
    }
  };

  return (
    <>
      <BookSearch
        onSelect={handleSelect}
        placeholder="Title, author, or ISBN..."
        existingExternalIds={clubId ? existingExternalIds : undefined}
      />
      {selected && (
        <p className="mt-4 text-sm text-gray-500">Loading {selected.title}...</p>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Find a book</h1>
      <p className="mb-8 text-sm text-gray-500">Search millions of books from Open Library and Google Books</p>
      <Suspense>
        <SearchContent />
      </Suspense>
    </div>
  );
}
