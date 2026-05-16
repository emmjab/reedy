"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SetCurrentBookProps {
  clubId: string;
  bookId: string;
  isCurrent: boolean;
}

export function SetCurrentBook({ clubId, bookId, isCurrent }: SetCurrentBookProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCurrent: !isCurrent }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <Button variant={isCurrent ? "secondary" : "primary"} size="sm" loading={loading} onClick={handleClick}>
      {isCurrent ? "Unset current" : "Set as current read"}
    </Button>
  );
}
