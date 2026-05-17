"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { FriendButton } from "@/components/friends/FriendButton";

interface User {
  id: string;
  name: string | null;
  username: string | null;
}

interface FriendshipMap {
  [userId: string]: { id: string; status: "PENDING" | "ACCEPTED"; isSender: boolean };
}

interface UserSearchProps {
  existingFriendships: FriendshipMap;
}

export function UserSearch({ existingFriendships }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function friendState(userId: string) {
    const f = existingFriendships[userId];
    if (!f) return { type: "none" as const };
    if (f.status === "ACCEPTED") return { type: "friends" as const, id: f.id };
    if (f.isSender) return { type: "sent" as const, id: f.id };
    return { type: "received" as const, id: f.id };
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or username…"
        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {query.length >= 2 && (
        <div className="mt-3 space-y-2">
          {loading && <p className="text-sm text-gray-400">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="text-sm text-gray-400">No users found.</p>
          )}
          {results.map((user) => (
            <div key={user.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <Link href={`/profile/${user.username ?? user.id}`} className="hover:opacity-80">
                <p className="font-medium text-gray-900">{user.name}</p>
                {user.username && <p className="text-xs text-gray-400">@{user.username}</p>}
              </Link>
              <FriendButton toUserId={user.id} initialState={friendState(user.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
