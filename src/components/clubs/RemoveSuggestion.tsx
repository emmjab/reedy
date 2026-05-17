"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RemoveSuggestionProps {
  clubId: string;
  bookId: string;
}

export function RemoveSuggestion({ clubId, bookId }: RemoveSuggestionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/books?bookId=${bookId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" variant="danger" loading={loading} onClick={remove}>
      Remove suggestion
    </Button>
  );
}
