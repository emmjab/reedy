"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookSearch } from "@/components/books/BookSearch";
import type { BookSearchResult } from "@/types";

export default function SearchPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<BookSearchResult | null>(null);

  const handleSelect = async (result: BookSearchResult) => {
    setSelected(result);
    // Navigate to the book detail after a brief moment
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (res.ok) {
      const book = await res.json();
      router.push(`/books/${book.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Find a book</h1>
      <p className="mb-8 text-sm text-gray-500">Search millions of books from Open Library and Google Books</p>
      <BookSearch onSelect={handleSelect} placeholder="Title, author, or ISBN..." />
      {selected && (
        <p className="mt-4 text-sm text-gray-500">Loading {selected.title}...</p>
      )}
    </div>
  );
}
