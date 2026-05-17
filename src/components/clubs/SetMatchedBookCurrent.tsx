"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SetMatchedBookCurrentProps {
  clubId: string;
  bookId: string;
}

export function SetMatchedBookCurrent({ clubId, bookId }: SetMatchedBookCurrentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(false);
    try {
      // Add book to club first (upsert — safe if already there)
      const add = await fetch(`/api/clubs/${clubId}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (!add.ok) { setError(true); return; }

      // Then set as currently reading
      const set = await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: true }),
      });
      if (!set.ok) { setError(true); return; }

      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" loading={loading} onClick={handleClick}>
        Set as current book
      </Button>
      {error && <span className="text-xs text-red-500">Failed — try again</span>}
    </div>
  );
}
