import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookCard } from "@/components/books/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubActions } from "@/components/clubs/ClubActions";
import { SetCurrentBook } from "@/components/clubs/SetCurrentBook";
import { SetMeetingDate } from "@/components/clubs/SetMeetingDate";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const club = await db.bookClub.findUnique({ where: { id }, select: { name: true } });
  return { title: club?.name ?? "Book Club" };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  WANT_TO_READ: { label: "Want to read", color: "text-blue-600" },
  READING:      { label: "Reading",       color: "text-yellow-600" },
  READ:         { label: "Finished",      color: "text-green-600" },
  ABANDONED:    { label: "Abandoned",     color: "text-gray-400" },
};

export default async function ClubPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const club = await db.bookClub.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true, username: true } } },
        orderBy: { joinedAt: "asc" },
      },
      books: {
        include: {
          book: { include: { authors: { include: { author: true } }, editions: true } },
          selectedBy: { select: { id: true, name: true } },
        },
        orderBy: { addedAt: "desc" },
      },
      discussions: {
        include: {
          user: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { members: true, books: true, discussions: true } },
    },
  });

  if (!club) notFound();

  const myMembership = club.members.find((m) => m.userId === session.user!.id);
  if (!club.isPublic && !myMembership) redirect("/clubs");

  const isAdmin = myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";
  const isOwner = myMembership?.role === "OWNER";
  const memberIds = club.members.map((m) => m.userId);

  // Separate current, past, and queued books
  const currentBook = club.books.find((b) => b.isCurrent) ?? null;
  const now = new Date();
  const pastBooks = club.books.filter(
    (b) => !b.isCurrent && b.meetingDate && new Date(b.meetingDate) < now
  ).sort((a, b) => new Date(b.meetingDate!).getTime() - new Date(a.meetingDate!).getTime());
  const queuedBooks = club.books.filter(
    (b) => !b.isCurrent && !(b.meetingDate && new Date(b.meetingDate) < now)
  );

  // Who's reading the current book
  const participants = currentBook
    ? await db.userBook.findMany({
        where: { bookId: currentBook.bookId, userId: { in: memberIds } },
        include: { user: { select: { id: true, name: true } } },
      })
    : [];

  const participantMap = Object.fromEntries(participants.map((p) => [p.userId, p]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
          {club.description && <p className="mt-1 text-gray-500">{club.description}</p>}
          <div className="mt-2 flex gap-3 text-sm text-gray-400">
            <span>{club._count.members} {club._count.members === 1 ? "member" : "members"}</span>
            <span>{club._count.books} {club._count.books === 1 ? "book" : "books"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {myMembership && (
            <Badge variant={isOwner ? "info" : "default"}>
              {myMembership.role.charAt(0) + myMembership.role.slice(1).toLowerCase()}
            </Badge>
          )}
          <ClubActions clubId={id} isMember={!!myMembership} isOwner={isOwner} isPublic={club.isPublic} />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
        {/* Main column */}
        <div className="space-y-10">

          {/* ── Current read ── */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Current Read</h2>
            {currentBook ? (
              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
                <div className="flex gap-5">
                  {/* Cover */}
                  <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow">
                    {currentBook.book.coverUrl ? (
                      <Image src={currentBook.book.coverUrl} alt={currentBook.book.title} fill className="object-cover" sizes="96px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl">📚</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <Link href={`/books/${currentBook.bookId}`} className="font-bold text-xl text-gray-900 hover:text-brand-700 line-clamp-2">
                      {currentBook.book.title}
                    </Link>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {currentBook.book.authors.map((a) => a.author.name).join(", ")}
                    </p>

                    <div className="mt-3">
                      {isAdmin ? (
                        <SetMeetingDate clubId={id} bookId={currentBook.bookId} currentDate={currentBook.meetingDate} />
                      ) : currentBook.meetingDate ? (
                        <p className="flex items-center gap-1.5 text-sm text-gray-600">
                          <span>📅</span>
                          {new Date(currentBook.meetingDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                      ) : (
                        <p className="text-sm italic text-gray-400">No meeting date set</p>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="mt-3">
                        <SetCurrentBook clubId={id} bookId={currentBook.bookId} isCurrent={true} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Who's participating */}
                <div className="mt-6 border-t border-brand-100 pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Who's reading ({participants.length}/{club.members.length})
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {club.members.map((m) => {
                      const ub = participantMap[m.userId];
                      const statusInfo = ub ? STATUS_LABEL[ub.status] : null;
                      return (
                        <div key={m.userId} className="flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1.5 shadow-sm">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                            {m.user.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className="text-sm font-medium text-gray-800">{m.user.name}</span>
                          {statusInfo ? (
                            <span className={`text-xs ${statusInfo.color}`}>{statusInfo.label}</span>
                          ) : (
                            <span className="text-xs text-gray-300">not started</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-gray-500">No current read selected.</p>
                {isAdmin && queuedBooks.length > 0 && (
                  <p className="mt-1 text-sm text-gray-400">Pick one from the queue below.</p>
                )}
                {myMembership && (
                  <Link href={`/search?clubId=${id}`} className="mt-4 inline-block">
                    <Button size="sm">Add a book</Button>
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* ── Queue ── */}
          {(queuedBooks.length > 0 || isAdmin) && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800">Up Next</h2>
                {myMembership && (
                  <Link href={`/search?clubId=${id}`}>
                    <Button size="sm" variant="secondary">+ Add book</Button>
                  </Link>
                )}
              </div>
              {queuedBooks.length > 0 ? (
                <div className="space-y-3">
                  {queuedBooks.map((cb) => (
                    <div key={cb.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <BookCard book={cb.book} />
                      </div>
                      {isAdmin && (
                        <div className="shrink-0">
                          <SetCurrentBook clubId={id} bookId={cb.bookId} isCurrent={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Nothing queued yet.</p>
              )}
            </section>
          )}

          {/* ── Past reads ── */}
          {pastBooks.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Past Reads</h2>
              <div className="space-y-3">
                {pastBooks.map((cb) => (
                  <div key={cb.id}>
                    <BookCard book={cb.book} />
                    <p className="mt-1 ml-3 text-xs text-gray-400">
                      Met {new Date(cb.meetingDate!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Discussions ── */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Discussions</h2>
              {myMembership && (
                <Link href={`/clubs/${id}/discussions/new`}>
                  <Button size="sm" variant="secondary">+ New thread</Button>
                </Link>
              )}
            </div>
            {club.discussions.length > 0 ? (
              <div className="space-y-3">
                {club.discussions.map((d) => (
                  <Link
                    key={d.id}
                    href={`/clubs/${id}/discussions/${d.id}`}
                    className="block rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
                  >
                    <p className="font-medium text-gray-900">{d.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {d.user.name} · {d._count.comments} {d._count.comments === 1 ? "reply" : "replies"} · {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">No discussions yet.</p>
                {myMembership && (
                  <Link href={`/clubs/${id}/discussions/new`} className="mt-3 inline-block">
                    <Button size="sm">Start one</Button>
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Members sidebar */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Members</h2>
          <div className="space-y-3">
            {club.members.map((m) => (
              <Link key={m.userId} href={`/profile/${m.user.username ?? m.userId}`} className="flex items-center gap-3 hover:opacity-80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
                  {m.user.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{m.user.name}</p>
                  {m.role !== "MEMBER" && (
                    <p className="text-xs text-gray-400 capitalize">{m.role.toLowerCase()}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
