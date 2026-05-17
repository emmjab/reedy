"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddSuggestion } from "@/components/clubs/AddSuggestion";

export interface SuggestedBookData {
  bookId: string;
  title: string;
  coverUrl: string | null;
  authors: string[];
  addedAt: string;
  suggestedById: string | null;
  suggestedByName: string | null;
}

interface SuggestionsPanelProps {
  clubId: string;
  books: SuggestedBookData[];
  isAdmin: boolean;
  isMember: boolean;
  currentUserId: string;
  currentBook: { bookId: string; title: string } | null;
  existingBookIds: string[];
}

export function SuggestionsPanel({
  clubId, books, isAdmin, isMember, currentUserId, currentBook, existingBookIds,
}: SuggestionsPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [setCurrentConfirm, setSetCurrentConfirm] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = (bookId: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(bookId) ? n.delete(bookId) : n.add(bookId); return n; });

  const noneSelected = selected.size === 0;
  const canSetCurrent = isAdmin && selected.size === 1;
  const canAddToQueue = isAdmin && !noneSelected;
  const canMarkCompleted = isAdmin && !noneSelected;

  const canRemoveBook = (book: SuggestedBookData) =>
    isAdmin || book.suggestedById === currentUserId;

  const patch = (bookId: string, body: object) =>
    fetch(`/api/clubs/${clubId}/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => { if (!r.ok) throw new Error(); });

  const del = (bookId: string) =>
    fetch(`/api/clubs/${clubId}/books?bookId=${bookId}`, { method: "DELETE" })
      .then((r) => { if (!r.ok) throw new Error(); });

  const run = async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
      setSelected(new Set());
      router.refresh();
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrent = () => {
    if (currentBook) { setSetCurrentConfirm(true); return; }
    const bookId = [...selected][0];
    run(() => patch(bookId, { isCurrent: true }));
  };

  const handleSetCurrentConfirm = (displaceAction: "queue" | "past") => {
    setSetCurrentConfirm(false);
    const bookId = [...selected][0];
    run(async () => {
      await patch(currentBook!.bookId, displaceAction === "queue"
        ? { isCurrent: false, isQueued: true }
        : { completedAt: new Date().toISOString() });
      await patch(bookId, { isCurrent: true });
    });
  };

  const handleAddToQueue = () =>
    run(async () => { await Promise.all([...selected].map((id) => patch(id, { isQueued: true }))); });

  const handleMarkCompleted = () =>
    run(async () => { await Promise.all([...selected].map((id) => patch(id, { completedAt: new Date().toISOString() }))); });

  const handleRemove = (bookId: string) =>
    run(async () => { await del(bookId); setRemoveConfirmId(null); });

  return (
    <div>
      {/* Toolbar */}
      {isMember && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AddSuggestion clubId={clubId} existingBookIds={existingBookIds} />
          <div className="h-5 w-px bg-gray-200" />
          <Button size="sm" variant="secondary" disabled={!canSetCurrent || loading} onClick={handleSetCurrent}>
            Set as current book
          </Button>
          <Button size="sm" variant="secondary" disabled={!canAddToQueue || loading} onClick={handleAddToQueue}>
            Add to queue
          </Button>
          <Button size="sm" variant="secondary" disabled={!canMarkCompleted || loading} onClick={handleMarkCompleted}>
            Mark completed
          </Button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {/* Set-current displacement confirmation */}
      {setCurrentConfirm && currentBook && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm space-y-2">
          <p className="text-amber-800">
            <span className="font-medium">"{currentBook.title}"</span> is the current book. Where should it go?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" loading={loading} onClick={() => handleSetCurrentConfirm("queue")}>Move to queue</Button>
            <Button size="sm" variant="secondary" loading={loading} onClick={() => handleSetCurrentConfirm("past")}>Move to past reads</Button>
            <Button size="sm" variant="ghost" onClick={() => setSetCurrentConfirm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Book list */}
      {books.length > 0 ? (
        <div className="space-y-2">
          {books.map((book) => (
            <div key={book.bookId} className="flex items-center gap-3">
              {isMember && (
                <input
                  type="checkbox"
                  checked={selected.has(book.bookId)}
                  onChange={() => toggle(book.bookId)}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              )}
              <div className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                {removeConfirmId === book.bookId ? (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-700">Remove this suggestion?</p>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="danger" loading={loading} onClick={() => handleRemove(book.bookId)}>Remove</Button>
                      <Button size="sm" variant="ghost" onClick={() => setRemoveConfirmId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-gray-100">
                      {book.coverUrl ? (
                        <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="40px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm">📚</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/books/${book.bookId}`} className="font-medium text-gray-900 hover:text-brand-700 line-clamp-1">
                        {book.title}
                      </Link>
                      {book.authors.length > 0 && (
                        <p className="text-sm text-gray-500 line-clamp-1">{book.authors.join(", ")}</p>
                      )}
                      <p className="mt-0.5 text-xs text-gray-400" suppressHydrationWarning>
                        Suggested{book.suggestedByName ? ` by ${book.suggestedByName}` : ""}{" "}
                        · {new Date(book.addedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    {isMember && canRemoveBook(book) && (
                      <button
                        onClick={() => setRemoveConfirmId(book.bookId)}
                        className="shrink-0 self-start text-gray-300 hover:text-red-400 transition-colors"
                        aria-label="Remove suggestion"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No suggestions yet.</p>
      )}
    </div>
  );
}
