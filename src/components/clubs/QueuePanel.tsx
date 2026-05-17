"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";

export interface QueuedBookData {
  bookId: string;
  title: string;
  coverUrl: string | null;
  authors: string[];
  addedAt: string;
  suggestedByName: string | null;
}

interface QueuePanelProps {
  clubId: string;
  books: QueuedBookData[];
  isAdmin: boolean;
  currentBook: { bookId: string; title: string } | null;
}

function GripIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <path d="M7 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM13 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM13 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7 15a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM13 15a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
    </svg>
  );
}

function SortableBook({
  book, index, isAdmin, clubId, isSelected, onToggle, removeConfirmId, setRemoveConfirmId, loading, onRemove,
}: {
  book: QueuedBookData;
  index: number;
  isAdmin: boolean;
  clubId: string;
  isSelected: boolean;
  onToggle: (bookId: string) => void;
  removeConfirmId: string | null;
  setRemoveConfirmId: (id: string | null) => void;
  loading: boolean;
  onRemove: (bookId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: book.bookId, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      {/* Drag handle */}
      {isAdmin && (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing touch-none"
          aria-label="Drag to reorder"
        >
          <GripIcon />
        </button>
      )}

      {/* Checkbox */}
      {isAdmin && (
        <input
          type="checkbox"
          data-no-dnd
          checked={isSelected}
          onChange={() => onToggle(book.bookId)}
          className="h-4 w-4 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
        />
      )}

      {/* Card with number badge */}
      <div className={`relative flex-1 ${!isAdmin ? "ml-3" : ""}`}>
        <span className="absolute -top-2 -left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-[10px] font-bold text-white ring-2 ring-white">
          {index + 1}
        </span>
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        {removeConfirmId === book.bookId ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700">Remove from queue? It will go back to suggestions.</p>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="danger" loading={loading} onClick={() => onRemove(book.bookId)}>Remove</Button>
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
              <p className="mt-0.5 text-xs text-gray-400">
                Suggested{book.suggestedByName ? ` by ${book.suggestedByName}` : ""}{" "}
                · {new Date(book.addedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setRemoveConfirmId(book.bookId)}
                className="shrink-0 self-start text-gray-300 hover:text-red-400 transition-colors"
                aria-label="Remove from queue"
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
    </div>
  );
}

export function QueuePanel({ clubId, books: initialBooks, isAdmin, currentBook }: QueuePanelProps) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [setCurrentConfirm, setSetCurrentConfirm] = useState(false);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const toggle = (bookId: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(bookId) ? n.delete(bookId) : n.add(bookId); return n; });

  const noneSelected = selected.size === 0;
  const canSetCurrent = selected.size === 1;
  const canMarkCompleted = !noneSelected;

  const patch = (bookId: string, body: object) =>
    fetch(`/api/clubs/${clubId}/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => { if (!r.ok) throw new Error(); });

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = books.findIndex((b) => b.bookId === active.id);
    const newIndex = books.findIndex((b) => b.bookId === over.id);
    const reordered = arrayMove(books, oldIndex, newIndex);
    setBooks(reordered);
    fetch(`/api/clubs/${clubId}/books/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookIds: reordered.map((b) => b.bookId) }),
    });
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

  const handleMarkCompleted = () =>
    run(async () => { await Promise.all([...selected].map((id) => patch(id, { completedAt: new Date().toISOString() }))); });

  const handleRemove = (bookId: string) =>
    run(async () => { await patch(bookId, { isQueued: false }); setRemoveConfirmId(null); });

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" disabled={!canSetCurrent || loading} onClick={handleSetCurrent}>
            Set as current book
          </Button>
          <Button size="sm" variant="secondary" disabled={!canMarkCompleted || loading} onClick={handleMarkCompleted}>
            Mark completed
          </Button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

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

      {books.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={books.map((b) => b.bookId)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {books.map((book, index) => (
                <SortableBook
                  key={book.bookId}
                  book={book}
                  index={index}
                  isAdmin={isAdmin}
                  clubId={clubId}
                  isSelected={selected.has(book.bookId)}
                  onToggle={toggle}
                  removeConfirmId={removeConfirmId}
                  setRemoveConfirmId={setRemoveConfirmId}
                  loading={loading}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
