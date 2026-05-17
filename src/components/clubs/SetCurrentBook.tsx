"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SetCurrentBookProps {
  clubId: string;
  bookId: string;
  isCurrent: boolean;
  currentBook?: { bookId: string; title: string } | null;
}

export function SetCurrentBook({ clubId, bookId, isCurrent, currentBook }: SetCurrentBookProps) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirming" | "loading">("idle");
  const [error, setError] = useState(false);

  const setCurrent = async (displaceAction: "queue" | "past" | null) => {
    setStep("loading");
    setError(false);
    try {
      if (displaceAction && currentBook) {
        const body = displaceAction === "queue"
          ? { isCurrent: false, isQueued: true }
          : { completedAt: new Date().toISOString() };
        const res = await fetch(`/api/clubs/${clubId}/books/${currentBook.bookId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) { setError(true); setStep("idle"); return; }
      }

      const res = await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: !isCurrent }),
      });
      if (!res.ok) { setError(true); setStep("idle"); return; }
      router.refresh();
    } catch {
      setError(true);
      setStep("idle");
    }
  };

  const handleClick = () => {
    if (!isCurrent && currentBook) {
      setStep("confirming");
    } else {
      setCurrent(null);
    }
  };

  if (step === "confirming" && currentBook) {
    return (
      <div className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm space-y-2">
        <p className="text-amber-800">
          <span className="font-medium">"{currentBook.title}"</span> is the current book. Where should it go?
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setCurrent("queue")}>Move to queue</Button>
          <Button size="sm" variant="secondary" onClick={() => setCurrent("past")}>Move to past reads</Button>
          <Button size="sm" variant="ghost" onClick={() => setStep("idle")}>Cancel</Button>
        </div>
        {error && <p className="text-xs text-red-500">Failed — try again</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant={isCurrent ? "secondary" : "primary"} size="sm" loading={step === "loading"} onClick={handleClick}>
        {isCurrent ? "Unset current book" : "Set as current book"}
      </Button>
      {error && <span className="text-xs text-red-500">Failed — try again</span>}
    </div>
  );
}
