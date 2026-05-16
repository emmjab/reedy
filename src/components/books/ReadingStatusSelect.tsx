"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { UserBook, ReadingStatus } from "@/types";

const STATUSES: { value: ReadingStatus; label: string; emoji: string }[] = [
  { value: "WANT_TO_READ", label: "Want to Read", emoji: "📚" },
  { value: "READING", label: "Currently Reading", emoji: "📖" },
  { value: "READ", label: "Finished", emoji: "✅" },
  { value: "ABANDONED", label: "Abandoned", emoji: "🚫" },
];

interface ReadingStatusSelectProps {
  bookId: string;
  current?: UserBook | null;
  onUpdate?: (userBook: UserBook) => void;
}

export function ReadingStatusSelect({ bookId, current, onUpdate }: ReadingStatusSelectProps) {
  const [loading, setLoading] = useState(false);
  const [userBook, setUserBook] = useState<UserBook | null>(current ?? null);

  const update = async (status: ReadingStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/books/${bookId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated: UserBook = await res.json();
        setUserBook(updated);
        onUpdate?.(updated);
      }
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    setLoading(true);
    try {
      await fetch(`/api/books/${bookId}/status`, { method: "DELETE" });
      setUserBook(null);
      onUpdate?.(null as unknown as UserBook);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => (
        <Button
          key={s.value}
          variant={userBook?.status === s.value ? "primary" : "secondary"}
          size="sm"
          loading={loading}
          onClick={() => update(s.value)}
        >
          {s.emoji} {s.label}
        </Button>
      ))}
      {userBook && (
        <Button variant="ghost" size="sm" loading={loading} onClick={remove} className="text-gray-400">
          Remove
        </Button>
      )}
    </div>
  );
}
