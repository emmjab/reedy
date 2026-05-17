"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface MarkCompletedProps {
  clubId: string;
  bookId: string;
}

export function MarkCompleted({ clubId, bookId }: MarkCompletedProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedAt: new Date().toISOString() }),
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" loading={loading} onClick={handleClick}>
        Mark as completed
      </Button>
      {error && <span className="text-xs text-red-500">Failed — try again</span>}
    </div>
  );
}
