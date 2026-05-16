import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookCard } from "@/components/books/BookCard";
import { Button } from "@/components/ui/button";
import type { ReadingStatus } from "@/types";

const SECTIONS: { status: ReadingStatus; label: string; emoji: string }[] = [
  { status: "READING", label: "Currently Reading", emoji: "📖" },
  { status: "WANT_TO_READ", label: "Want to Read", emoji: "📚" },
  { status: "READ", label: "Finished", emoji: "✅" },
  { status: "ABANDONED", label: "Abandoned", emoji: "🚫" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userBooks = await db.userBook.findMany({
    where: { userId: session.user.id! },
    include: { book: { include: { authors: { include: { author: true } }, editions: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const byStatus = userBooks.reduce<Record<string, typeof userBooks>>((acc, ub) => {
    (acc[ub.status] ??= []).push(ub);
    return acc;
  }, {});

  const totalRead = byStatus["READ"]?.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {session.user.name?.split(" ")[0] ?? "reader"} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalRead > 0 ? `${totalRead} ${totalRead === 1 ? "book" : "books"} finished this year` : "Start tracking your reading"}
          </p>
        </div>
        <Link href="/search"><Button>+ Add book</Button></Link>
      </div>

      <div className="mt-10 space-y-10">
        {SECTIONS.map(({ status, label, emoji }) => {
          const books = byStatus[status] ?? [];
          if (books.length === 0) return null;
          return (
            <section key={status}>
              <h2 className="mb-4 text-lg font-semibold text-gray-800">
                {emoji} {label} <span className="ml-1 text-sm font-normal text-gray-400">({books.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {books.map((ub) => (
                  <BookCard key={ub.bookId} book={ub.book} userBook={ub} />
                ))}
              </div>
            </section>
          );
        })}

        {userBooks.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
            <p className="text-4xl">📚</p>
            <p className="mt-4 font-medium text-gray-700">Your shelf is empty</p>
            <p className="mt-1 text-sm text-gray-500">Search for a book to get started</p>
            <Link href="/search" className="mt-6 inline-block"><Button>Find your next read</Button></Link>
          </div>
        )}
      </div>
    </div>
  );
}
