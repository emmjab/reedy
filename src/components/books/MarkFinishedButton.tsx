"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface MarkFinishedButtonProps {
  bookId: string;
  userBook: {
    rating: string | null;
    notes: string | null;
    startedAt: Date | null;
  };
}

export function MarkFinishedButton({ bookId, userBook }: MarkFinishedButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const markFinished = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/books/${bookId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "READ",
          finishedAt: new Date().toISOString(),
          rating: userBook.rating ?? null,
          notes: userBook.notes ?? null,
          startedAt: userBook.startedAt?.toISOString() ?? null,
        }),
      });
      if (!res.ok) { setError(true); return; }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" loading={loading} onClick={markFinished}>
        Mark as finished
      </Button>
      {error && <span className="text-xs text-red-500">Failed — try again</span>}
    </div>
  );
}
