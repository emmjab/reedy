"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface RemoveMemberProps {
  clubId: string;
  userId: string;
  name: string | null;
}

export function RemoveMember({ clubId, userId, name }: RemoveMemberProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const remove = async () => {
    setLoading(true);
    await fetch(`/api/clubs/${clubId}/members/${userId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  };

  if (confirming) {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-xs text-gray-500">Remove {name ?? "member"}?</span>
        <Button size="sm" variant="danger" loading={loading} onClick={remove}>Remove</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="shrink-0 text-gray-300 hover:text-red-400 transition-colors"
      aria-label={`Remove ${name ?? "member"}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
      </svg>
    </button>
  );
}
