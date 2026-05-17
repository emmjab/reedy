"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { UserBook, ReadingStatus, BookRating } from "@/types";

const STATUSES: { value: ReadingStatus; label: string; emoji: string }[] = [
  { value: "WANT_TO_READ", label: "Want to Read", emoji: "📚" },
  { value: "READING", label: "Reading", emoji: "📖" },
  { value: "READ", label: "Finished", emoji: "✅" },
  { value: "ABANDONED", label: "Abandoned", emoji: "🚫" },
];

const RATINGS: { value: BookRating; label: string; color: string }[] = [
  { value: "GREAT", label: "great!", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "GOOD", label: "good", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "OK", label: "ok", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "MEH", label: "meh", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "EH", label: "eh...", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "SO_BAD", label: "so bad", color: "bg-red-100 text-red-800 border-red-300" },
];

interface ShelfPanelProps {
  bookId: string;
  initialUserBook: UserBook | null;
}

export function ShelfPanel({ bookId, initialUserBook }: ShelfPanelProps) {
  const [userBook, setUserBook] = useState<UserBook | null>(initialUserBook);
  const [notes, setNotes] = useState(initialUserBook?.notes ?? "");
  const [notesSaved, setNotesSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  const update = async (patch: Partial<Pick<UserBook, "status" | "rating" | "notes" | "startedAt" | "finishedAt">>) => {
    if (!userBook && !patch.status) return;
    setSaving(true);
    try {
      const current = userBook ?? { status: patch.status! };
      const res = await fetch(`/api/books/${bookId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: current.status,
          rating: (current as UserBook).rating ?? null,
          notes: (current as UserBook).notes ?? null,
          startedAt: (current as UserBook).startedAt ?? null,
          finishedAt: (current as UserBook).finishedAt ?? null,
          ...patch,
        }),
      });
      if (res.ok) {
        const updated: UserBook = await res.json();
        setUserBook(updated);
        setNotes(updated.notes ?? "");
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await fetch(`/api/books/${bookId}/status`, { method: "DELETE" });
      setUserBook(null);
      setNotes("");
      setNotesSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    await update({ notes });
    setNotesSaved(true);
  };

  const showRating = userBook && (userBook.status === "READ" || userBook.status === "READING" || userBook.status === "ABANDONED");
  const showDates = userBook && (userBook.status === "READING" || userBook.status === "READ");

  return (
    <div className="space-y-6">
      {/* Status */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your shelf</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Button
              key={s.value}
              variant={userBook?.status === s.value ? "primary" : "secondary"}
              size="sm"
              loading={saving}
              onClick={() => update({ status: s.value })}
            >
              {s.emoji} {s.label}
            </Button>
          ))}
          {userBook && (
            <Button variant="ghost" size="sm" loading={saving} onClick={remove} className="text-gray-400">
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Rating */}
      {showRating && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your rating</p>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map((r) => {
              const active = userBook?.rating === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => update({ rating: active ? null : r.value })}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition-all ${active ? r.color + " ring-2 ring-offset-1 ring-current" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dates */}
      {showDates && (
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Started</label>
            <input
              type="date"
              value={userBook?.startedAt ? new Date(userBook.startedAt).toISOString().slice(0, 10) : ""}
              onChange={(e) => update({ startedAt: e.target.value ? new Date(e.target.value) : null })}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {userBook?.status === "READ" && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Finished</label>
              <input
                type="date"
                value={userBook?.finishedAt ? new Date(userBook.finishedAt).toISOString().slice(0, 10) : ""}
                onChange={(e) => update({ finishedAt: e.target.value ? new Date(e.target.value) : null })}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {userBook && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Your notes</p>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            placeholder="What did you think? Any quotes or thoughts to remember..."
            rows={4}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {!notesSaved && (
            <div className="mt-2 flex items-center gap-3">
              <Button size="sm" onClick={saveNotes} loading={saving}>Save notes</Button>
              <button onClick={() => { setNotes(userBook.notes ?? ""); setNotesSaved(true); }} className="text-sm text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            </div>
          )}
          {notesSaved && notes && <p className="mt-1 text-xs text-gray-400">Saved</p>}
        </div>
      )}
    </div>
  );
}
