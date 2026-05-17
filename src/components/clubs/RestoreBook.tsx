"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RestoreBookProps {
  clubId: string;
  bookId: string;
  currentBook: { bookId: string; title: string } | null;
}

export function RestoreBook({ clubId, bookId, currentBook }: RestoreBookProps) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirming" | "loading">("idle");
  const [error, setError] = useState(false);

  const restore = async (queueDisplaced: boolean) => {
    setStep("loading");
    setError(false);
    try {
      // Optionally move the displaced current book to queue first
      if (queueDisplaced && currentBook) {
        const res = await fetch(`/api/clubs/${clubId}/books/${currentBook.bookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isCurrent: false, isQueued: true }),
        });
        if (!res.ok) { setError(true); setStep("idle"); return; }
      }

      // Restore the past book as currently reading
      const res = await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: true }),
      });
      if (!res.ok) { setError(true); setStep("idle"); return; }

      router.refresh();
    } catch {
      setError(true);
      setStep("idle");
    }
  };

  const handleClick = () => {
    if (currentBook) {
      setStep("confirming");
    } else {
      restore(false);
    }
  };

  if (step === "confirming" && currentBook) {
    return (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm space-y-2">
        <p className="text-amber-800">
          <span className="font-medium">"{currentBook.title}"</span> is the current book. What should happen to it?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => restore(true)}>Move to queue</Button>
          <Button size="sm" variant="secondary" onClick={() => restore(false)}>Move back to suggestions</Button>
          <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="secondary" loading={step === "loading"} onClick={handleClick}>
        Set as current book
      </Button>
      {error && <span className="text-xs text-red-500">Failed — try again</span>}
    </div>
  );
}
