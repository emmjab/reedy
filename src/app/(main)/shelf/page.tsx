import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookCard } from "@/components/books/BookCard";
import { MarkFinishedButton } from "@/components/books/MarkFinishedButton";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Shelf" };

export default async function ShelfPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;

  const [user, clubBooks] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: {
        userBooks: {
          include: { book: { include: { authors: { include: { author: true } }, editions: true } } },
          orderBy: { updatedAt: "desc" },
        },
      },
    }),
    db.bookClubBook.findMany({
      where: {
        club: {
          isArchived: false,
          OR: [
            { members: { some: { userId } } },
            { isPublic: true },
          ],
        },
      },
      select: {
        bookId: true,
        meetingDate: true,
        isCurrent: true,
        club: {
          select: {
            id: true,
            name: true,
            members: { where: { userId }, select: { userId: true } },
          },
        },
      },
    }),
  ]);

  if (!user) redirect("/login");

  // Map bookId → all clubs that have this book (member + public non-member)
  type ClubEntry = { clubId: string; clubName: string; meetingDate: Date | null; isMember: boolean };
  const clubMap = new Map<string, ClubEntry[]>();
  for (const cb of clubBooks) {
    const isMember = cb.club.members.length > 0;
    const entry: ClubEntry = {
      clubId: cb.club.id,
      clubName: cb.club.name,
      meetingDate: cb.meetingDate,
      isMember,
    };
    const existing = clubMap.get(cb.bookId);
    if (existing) {
      existing.push(entry);
    } else {
      clubMap.set(cb.bookId, [entry]);
    }
  }

  const byStatus = user.userBooks.reduce<Record<string, typeof user.userBooks>>((acc, ub) => {
    (acc[ub.status] ??= []).push(ub);
    return acc;
  }, {});

  function ClubBadges({ bookId }: { bookId: string }) {
    const clubs = clubMap.get(bookId);
    if (!clubs?.length) return null;
    return (
      <div className="mt-1.5 flex flex-wrap gap-1 px-1">
        {clubs.map((c) => (
          <Link
            key={c.clubId}
            href={`/clubs/${c.clubId}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${
              c.isMember
                ? "bg-brand-50 text-brand-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {c.clubName}
            {c.meetingDate && (
              <span className={c.isMember ? "text-brand-400" : "text-gray-400"}>
                · {new Date(c.meetingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {!c.isMember && (
              <span className="ml-0.5 rounded-full bg-gray-200 px-1 text-gray-500">join?</span>
            )}
          </Link>
        ))}
      </div>
    );
  }

  type UserBook = (typeof user)["userBooks"][number];
  function BookSection({ books }: { books: UserBook[] }) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((ub) => (
          <div key={ub.bookId}>
            <BookCard book={ub.book} userBook={ub} />
            <ClubBadges bookId={ub.bookId} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">My Shelf</h1>
        <div className="flex items-center gap-3">
          <Link href="/import" className="text-sm text-gray-400 hover:text-gray-700">Import from Goodreads</Link>
          <Link href="/search"><Button>+ Add book</Button></Link>
        </div>
      </div>

      {/* Currently reading */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Currently Reading</h2>
        {(byStatus["READING"]?.length ?? 0) > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byStatus["READING"].map((ub) => (
              <div key={ub.bookId}>
                <BookCard book={ub.book} userBook={ub} />
                <ClubBadges bookId={ub.bookId} />
                <div className="mt-1.5 px-1">
                  <MarkFinishedButton
                    bookId={ub.bookId}
                    userBook={{ rating: ub.rating, notes: ub.notes, startedAt: ub.startedAt }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nothing in progress. <Link href="/search" className="text-brand-600 hover:underline">Find something to read.</Link></p>
        )}
      </section>

      {/* Want to read */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Want to Read</h2>
        {(byStatus["WANT_TO_READ"]?.length ?? 0) > 0 ? (
          <BookSection books={byStatus["WANT_TO_READ"]} />
        ) : (
          <p className="text-sm text-gray-400">Nothing on your list yet.</p>
        )}
      </section>

      {/* Finished */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Finished</h2>
        {(byStatus["READ"]?.length ?? 0) > 0 ? (
          <BookSection books={byStatus["READ"]} />
        ) : (
          <p className="text-sm text-gray-400">No finished books yet.</p>
        )}
      </section>

      {/* Abandoned */}
      {(byStatus["ABANDONED"]?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Abandoned</h2>
          <BookSection books={byStatus["ABANDONED"]} />
        </section>
      )}
    </div>
  );
}
