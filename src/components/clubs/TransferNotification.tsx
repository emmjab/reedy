"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Member {
  userId: string;
  name: string | null;
}

interface TransferNotificationProps {
  transferId: string;
  clubId: string;
  clubName: string;
  fromName: string | null;
  eligibleMembers: Member[]; // other members excluding owner and self
}

export function TransferNotification({
  transferId,
  clubId,
  clubName,
  fromName,
  eligibleMembers,
}: TransferNotificationProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "pass">("idle");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: "accept" | "decline", nextUserId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transfers/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(nextUserId ? { nextUserId } : {}) }),
      });
      if (!res.ok) { setError("Failed — try again"); return; }
      router.refresh();
    } catch {
      setError("Failed — try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
      <div>
        <p className="font-semibold text-gray-900">
          You've been asked to take ownership of{" "}
          <Link href={`/clubs/${clubId}`} className="text-brand-700 hover:underline">
            {clubName}
          </Link>
        </p>
        <p className="mt-0.5 text-sm text-gray-500">
          {fromName ?? "The current owner"} wants to leave and is passing the book club to you.
        </p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" loading={loading} onClick={() => respond("accept")}>
            Accept ownership
          </Button>
          {eligibleMembers.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => setMode("pass")}>
              Pass to someone else
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              loading={loading}
              onClick={() => respond("decline")}
            >
              Decline (book club will be archived)
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Select a member to pass ownership to:</p>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Pick a member…</option>
            {eligibleMembers.map((m) => (
              <option key={m.userId} value={m.userId}>{m.name ?? m.userId}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button
              size="sm"
              loading={loading}
              disabled={!selectedId}
              onClick={() => respond("decline", selectedId)}
            >
              Pass ownership
            </Button>
            <Button size="sm" variant="secondary" onClick={() => { setMode("idle"); setSelectedId(""); }}>
              Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
