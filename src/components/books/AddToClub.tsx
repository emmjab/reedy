"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Club {
  id: string;
  name: string;
}

interface AddToClubProps {
  bookId: string;
}

export function AddToClub({ bookId }: AddToClubProps) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/clubs?mine=true")
      .then((r) => r.json())
      .then(setClubs)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const addToClub = async (clubId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      if (res.ok) setAdded((prev) => [...prev, clubId]);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  if (clubs.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen((o) => !o)}>
        + Add to club
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-lg">
          <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Your clubs</p>
          <ul className="pb-2">
            {clubs.map((club) => (
              <li key={club.id}>
                <button
                  disabled={loading || added.includes(club.id)}
                  onClick={() => addToClub(club.id)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>{club.name}</span>
                  {added.includes(club.id) && <span className="text-green-600">✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
