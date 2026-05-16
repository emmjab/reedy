"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { BookSearchResult } from "@/types";

interface BookSearchProps {
  onSelect: (book: BookSearchResult) => void;
  placeholder?: string;
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function BookSearch({ onSelect, placeholder = "Search for a book..." }: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const search = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 350),
    []
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    search(val);
  };

  const handleSelect = async (result: BookSearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);

    // Persist book to our DB before surfacing to parent
    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    });
    if (res.ok) onSelect(result);
  };

  return (
    <div className="relative w-full">
      <Input
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full"
      />

      {open && (loading || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
          )}
          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="p-4 text-center text-sm text-gray-500">No results found</div>
          )}
          <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {results.map((r, i) => (
              <li key={`${r.openLibraryWorkId ?? r.googleBooksId}-${i}`}>
                <button
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                    {r.coverUrl ? (
                      <Image src={r.coverUrl} alt={r.title} fill className="object-cover" sizes="40px" />
                    ) : (
                      <div className="h-full w-full bg-gray-200" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">{r.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{r.authors.join(", ")}</p>
                    {r.firstPublishYear && <p className="text-xs text-gray-400">{r.firstPublishYear}</p>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
