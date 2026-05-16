import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BookCard } from "@/components/books/BookCard";
import { ClubCard } from "@/components/clubs/ClubCard";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await db.user.findUnique({ where: { username }, select: { name: true } });
  return { title: user?.name ?? username };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const session = await auth();

  const user = await db.user.findUnique({
    where: { username },
    include: {
      userBooks: {
        include: { book: { include: { authors: { include: { author: true } }, editions: true } } },
        orderBy: { updatedAt: "desc" },
      },
      clubMemberships: {
        include: {
          club: { include: { _count: { select: { members: true, books: true, discussions: true } } } },
        },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  const byStatus = user.userBooks.reduce<Record<string, typeof user.userBooks>>((acc, ub) => {
    (acc[ub.status] ??= []).push(ub);
    return acc;
  }, {});

  const stats = [
    { label: "Read", count: byStatus["READ"]?.length ?? 0 },
    { label: "Reading", count: byStatus["READING"]?.length ?? 0 },
    { label: "Want to read", count: byStatus["WANT_TO_READ"]?.length ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          {user.username && <p className="text-sm text-gray-400">@{user.username}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{s.count}</p>
            <p className="mt-1 text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Currently reading */}
      {(byStatus["READING"]?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">📖 Currently Reading</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {byStatus["READING"].map((ub) => (
              <BookCard key={ub.bookId} book={ub.book} userBook={ub} />
            ))}
          </div>
        </section>
      )}

      {/* Recently read */}
      {(byStatus["READ"]?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">✅ Recently Read</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byStatus["READ"].slice(0, 6).map((ub) => (
              <BookCard key={ub.bookId} book={ub.book} userBook={ub} />
            ))}
          </div>
        </section>
      )}

      {/* Want to read — only show on own profile */}
      {isOwnProfile && (byStatus["WANT_TO_READ"]?.length ?? 0) > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">📚 Want to Read</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {byStatus["WANT_TO_READ"].slice(0, 6).map((ub) => (
              <BookCard key={ub.bookId} book={ub.book} userBook={ub} />
            ))}
          </div>
        </section>
      )}

      {/* Clubs */}
      {user.clubMemberships.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">👥 Book Clubs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {user.clubMemberships
              .filter((m) => m.club.isPublic || isOwnProfile)
              .map((m) => (
                <ClubCard key={m.clubId} club={{ ...m.club, members: [{ role: m.role }] }} />
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
