"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Member {
  userId: string;
  name: string | null;
}

interface PendingTransfer {
  id: string;
  leaveAfter: boolean;
  toUser: { name: string | null };
}

interface OwnerActionsProps {
  clubId: string;
  otherMembers: Member[];
  pendingTransfer: PendingTransfer | null;
}

type Panel = "idle" | "transfer-leave" | "transfer-stay" | "close";

export function OwnerActions({ clubId, otherMembers, pendingTransfer }: OwnerActionsProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("idle");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setPanel("idle"); setSelectedId(""); setError(null); };

  const requestTransfer = async (leaveAfter: boolean) => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: selectedId, leaveAfter }),
      });
      if (!res.ok) { setError("Failed — try again"); return; }
      router.refresh();
      reset();
    } catch {
      setError("Failed — try again");
    } finally {
      setLoading(false);
    }
  };

  const cancelTransfer = async () => {
    if (!pendingTransfer) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transfers/${pendingTransfer.id}`, { method: "DELETE" });
      if (!res.ok) { setError("Failed — try again"); return; }
      router.refresh();
    } catch {
      setError("Failed — try again");
    } finally {
      setLoading(false);
    }
  };

  const archive = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });
      if (!res.ok) { setError("Failed — try again"); return; }
      router.push("/clubs");
    } catch {
      setError("Failed — try again");
    } finally {
      setLoading(false);
    }
  };

  const deleteClub = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}`, { method: "DELETE" });
      if (!res.ok) { setError("Failed — try again"); return; }
      router.push("/clubs");
    } catch {
      setError("Failed — try again");
    } finally {
      setLoading(false);
    }
  };

  // Pending transfer — waiting for other member to respond
  if (pendingTransfer && panel === "idle") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm space-y-2 max-w-xs">
        <p className="text-amber-800 font-medium">
          Ownership request sent to {pendingTransfer.toUser.name ?? "member"}
        </p>
        <p className="text-amber-700 text-xs">
          {pendingTransfer.leaveAfter
            ? "You can leave once they accept."
            : "You'll stay as a member once they accept."}
        </p>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <Button size="sm" variant="secondary" loading={loading} onClick={cancelTransfer}>
          Cancel request
        </Button>
      </div>
    );
  }

  if (panel === "idle") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPanel(otherMembers.length > 0 ? "transfer-stay" : "close")}
        >
          Transfer ownership
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPanel(otherMembers.length > 0 ? "transfer-leave" : "close")}
        >
          Leave book club
        </Button>
      </div>
    );
  }

  if (panel === "transfer-stay" || panel === "transfer-leave") {
    const leaveAfter = panel === "transfer-leave";
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 text-sm max-w-xs">
        <p className="font-medium text-gray-800">Select a new owner</p>
        <p className="text-gray-500 text-xs">
          {leaveAfter
            ? "They'll get a notification to accept. You'll be removed once they do."
            : "They'll get a notification to accept. You'll stay as a member once they do."}
        </p>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Pick a member…</option>
          {otherMembers.map((m) => (
            <option key={m.userId} value={m.userId}>{m.name ?? m.userId}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <Button size="sm" loading={loading} disabled={!selectedId} onClick={() => requestTransfer(leaveAfter)}>
            Send request
          </Button>
          <Button size="sm" variant="secondary" onClick={reset}>Cancel</Button>
        </div>
      </div>
    );
  }

  // panel === "close" — sole member
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 text-sm max-w-xs">
      <p className="font-medium text-gray-800">You're the only member</p>
      <p className="text-gray-500 text-xs">
        Archive keeps the book club data but marks it inactive. Delete removes everything permanently.
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" loading={loading} onClick={archive}>Archive</Button>
        <Button size="sm" variant="danger" loading={loading} onClick={deleteClub}>Delete</Button>
        <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
      </div>
    </div>
  );
}
