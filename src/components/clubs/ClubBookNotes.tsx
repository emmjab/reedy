"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ClubBookNotesProps {
  clubId: string;
  bookId: string;
  initialNotes: string | null;
}

export function ClubBookNotes({ clubId, bookId, initialNotes }: ClubBookNotesProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft || null }),
      });
      if (!res.ok) { setError(true); return; }
      setEditing(false);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(initialNotes ?? "");
    setEditing(false);
    setError(false);
  };

  if (!editing) {
    return (
      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Club Notes</p>
        {initialNotes ? (
          <p
            className="cursor-pointer whitespace-pre-wrap text-sm text-gray-700 hover:text-gray-900"
            onClick={() => setEditing(true)}
          >
            {initialNotes}
          </p>
        ) : (
          <button
            className="text-sm text-gray-400 hover:text-gray-600 italic"
            onClick={() => setEditing(true)}
          >
            Add club notes…
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Club Notes</p>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Add notes for the club…"
        rows={4}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        autoFocus
      />
      {error && <p className="mt-1 text-xs text-red-500">Failed — try again</p>}
      <div className="mt-2 flex gap-2">
        <Button size="sm" loading={saving} onClick={save}>Save</Button>
        <Button size="sm" variant="secondary" onClick={cancel}>Cancel</Button>
      </div>
    </div>
  );
}
