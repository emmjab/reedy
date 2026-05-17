"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface FriendRequest {
  id: string;
  fromUser: { id: string; name: string | null; username: string | null };
}

interface TransferRequest {
  id: string;
  club: { id: string; name: string };
  fromUser: { name: string | null };
}

interface NotificationBellProps {
  friendRequests: FriendRequest[];
  transfers: TransferRequest[];
}

export function NotificationBell({ friendRequests, transfers }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState(friendRequests);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const count = friends.length + transfers.length;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function acceptFriend(id: string) {
    setLoading(id);
    const res = await fetch(`/api/friends/${id}`, { method: "PATCH" });
    if (res.ok) {
      setFriends((prev) => prev.filter((f) => f.id !== id));
      router.refresh();
    }
    setLoading(null);
  }

  async function declineFriend(id: string) {
    setLoading(id + "-decline");
    const res = await fetch(`/api/friends/${id}`, { method: "DELETE" });
    if (res.ok) setFriends((prev) => prev.filter((f) => f.id !== id));
    setLoading(null);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        aria-label={`${count} notification${count !== 1 ? "s" : ""}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
          <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clipRule="evenodd" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {friends.length === 0 && transfers.length === 0 && (
              <p className="px-4 py-4 text-sm text-gray-400">
                Notifications will appear here if you receive a friend or book club request.
              </p>
            )}
            {friends.map((req) => (
              <div key={req.id} className="px-4 py-3">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{req.fromUser.name ?? req.fromUser.username ?? "Someone"}</span>
                  {" "}sent you a friend request.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => acceptFriend(req.id)}
                    disabled={loading === req.id}
                    className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {loading === req.id ? "Accepting…" : "Accept"}
                  </button>
                  <button
                    onClick={() => declineFriend(req.id)}
                    disabled={loading === req.id + "-decline"}
                    className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    {loading === req.id + "-decline" ? "Declining…" : "Decline"}
                  </button>
                </div>
              </div>
            ))}
            {transfers.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{t.fromUser.name ?? "Someone"}</span>
                  {" "}wants to transfer ownership of{" "}
                  <span className="font-medium">{t.club.name}</span> to you.
                </p>
                <Link
                  href="/clubs"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-block rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                >
                  View on Book Clubs page
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
