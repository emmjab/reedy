"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface QueueToggleProps {
  clubId: string;
  bookId: string;
  isQueued: boolean;
}

export function QueueToggle({ clubId, bookId, isQueued }: QueueToggleProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const toggle = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isQueued: !isQueued }),
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
      <Button size="sm" variant="secondary" loading={loading} onClick={toggle}>
        {isQueued ? "Remove from queue" : "Add to queue"}
      </Button>
      {error && <span className="text-xs text-red-500">Failed — try again</span>}
    </div>
  );
}
