"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface SetMeetingDateProps {
  clubId: string;
  bookId: string;
  currentDate: Date | null;
}

export function SetMeetingDate({ clubId, bookId, currentDate }: SetMeetingDateProps) {
  const router = useRouter();
  const [date, setDate] = useState(currentDate ? currentDate.toISOString().slice(0, 10) : "");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const save = async () => {
    setLoading(true);
    await fetch(`/api/clubs/${clubId}/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingDate: date ? new Date(date).toISOString() : null }),
    });
    setLoading(false);
    setEditing(false);
    router.refresh();
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800" suppressHydrationWarning>
        <span>📅</span>
        {currentDate
          ? new Date(currentDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
          : <span className="italic text-gray-400">Set meeting date</span>}
        <span className="text-xs text-gray-300">✎</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        autoFocus
      />
      <Button size="sm" loading={loading} onClick={save}>Save</Button>
      <button onClick={() => setEditing(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
    </div>
  );
}
