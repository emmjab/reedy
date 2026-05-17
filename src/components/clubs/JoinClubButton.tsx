"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function JoinClubButton({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const join = async () => {
    setLoading(true);
    const res = await fetch(`/api/clubs/${clubId}/members`, { method: "POST" });
    setLoading(false);
    if (res.ok) {
      setJoined(true);
      router.refresh();
    }
  };

  if (joined) {
    return <p className="text-sm font-medium text-green-600">Joined!</p>;
  }

  return (
    <Button size="sm" loading={loading} onClick={join}>
      Join book club
    </Button>
  );
}
