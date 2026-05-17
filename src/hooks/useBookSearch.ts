"use client";

import { useState, useCallback, useRef } from "react";
import type { BookSearchResult } from "@/types";

interface UseBookSearchReturn {
  results: BookSearchResult[];
  loading: boolean;
  query: string;
  search: (q: string) => void;
  clear: () => void;
}

export function useBookSearch(): UseBookSearchReturn {
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { results, loading, query, search, clear };
}
