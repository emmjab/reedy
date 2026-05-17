"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type FriendState =
  | { type: "none" }
  | { type: "sent"; id: string }
  | { type: "received"; id: string }
  | { type: "friends"; id: string };

interface FriendButtonProps {
  toUserId: string;
  initialState: FriendState;
}

export function FriendButton({ toUserId, initialState }: FriendButtonProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId }),
      });
      if (!res.ok) { setError(true); return; }
      const data = await res.json();
      setState({ type: "sent", id: data.id });
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  const accept = async (id: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "PATCH" });
      if (!res.ok) { setError(true); return; }
      setState({ type: "friends", id });
      router.refresh();
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  const remove = async (id: string) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
      if (!res.ok) { setError(true); return; }
      setState({ type: "none" });
      router.refresh();
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-2">
      {state.type === "none" && (
        <Button size="sm" loading={loading} onClick={sendRequest}>Add friend</Button>
      )}
      {state.type === "sent" && (
        <Button size="sm" variant="secondary" loading={loading} onClick={() => remove(state.id)}>
          Request sent · Cancel
        </Button>
      )}
      {state.type === "received" && (
        <>
          <Button size="sm" loading={loading} onClick={() => accept(state.id)}>Accept request</Button>
          <Button size="sm" variant="secondary" loading={loading} onClick={() => remove(state.id)}>Decline</Button>
        </>
      )}
      {state.type === "friends" && (
        <Button size="sm" variant="secondary" loading={loading} onClick={() => remove(state.id)}>
          Friends · Remove
        </Button>
      )}
      {error && <span className="text-xs text-red-500">Failed — try again</span>}
    </div>
  );
}
