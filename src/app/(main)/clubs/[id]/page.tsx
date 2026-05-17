import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookCard } from "@/components/books/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubActions } from "@/components/clubs/ClubActions";
import { OwnerActions } from "@/components/clubs/OwnerActions";
import { SetCurrentBook } from "@/components/clubs/SetCurrentBook";
import { SetMeetingDate } from "@/components/clubs/SetMeetingDate";
import { MarkCompleted } from "@/components/clubs/MarkCompleted";
import { ClubBookNotes } from "@/components/clubs/ClubBookNotes";
import { SetMatchedBookCurrent } from "@/components/clubs/SetMatchedBookCurrent";
import { QueuePanel } from "@/components/clubs/QueuePanel";
import { RestoreBook } from "@/components/clubs/RestoreBook";
import { SuggestionsPanel } from "@/components/clubs/SuggestionsPanel";
import { ClubSettings } from "@/components/clubs/ClubSettings";
import { RemoveMember } from "@/components/clubs/RemoveMember";
import { SetMemberRole } from "@/components/clubs/SetMemberRole";
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
      _count: { select: { members: true, books: true } },
    },
  });

  if (!club) notFound();

  const myMembership = club.members.find((m) => m.userId === session.user!.id);
  if (!club.isPublic && !myMembership) redirect("/clubs");

  const isAdmin = myMembership?.role === "OWNER" || myMembership?.role === "ADMIN";
  const isOwner = myMembership?.role === "OWNER";
  const memberIds = club.members.map((m) => m.userId);

  const pendingTransfer = isOwner
    ? await db.clubOwnershipTransfer.findFirst({
        where: { clubId: id, fromUserId: session.user!.id, status: "PENDING" },
        select: { id: true, leaveAfter: true, toUser: { select: { name: true } } },
      })
    : null;

  // Separate current, past, and queued books
  const currentBook = club.books.find((b) => b.isCurrent) ?? null;
  const now = new Date();
  const pastBooks = club.books.filter(
    (b) => !b.isCurrent && (
      b.completedAt !== null ||
      (b.meetingDate && new Date(b.meetingDate) < now)
    )
  ).sort((a, b) => {
    const aDate = b.completedAt ?? b.meetingDate;
    const bDate = a.completedAt ?? a.meetingDate;
    return new Date(aDate!).getTime() - new Date(bDate!).getTime();
  });
  const notCurrentNotPast = (b: (typeof club.books)[0]) =>
    !b.isCurrent && !b.completedAt && !(b.meetingDate && new Date(b.meetingDate) < now);
  const queuedBooks = club.books
    .filter((b) => notCurrentNotPast(b) && b.isQueued)
    .sort((a, b) => {
      if (a.queueOrder == null && b.queueOrder == null) return 0;
      if (a.queueOrder == null) return 1;
      if (b.queueOrder == null) return -1;
      return a.queueOrder - b.queueOrder;
    });
  const suggestedBooks = club.books.filter((b) => notCurrentNotPast(b) && !b.isQueued);

  // Suggestion by match — books on 2+ members' want-to-read lists, not already in club
  const clubBookIds = new Set(club.books.map((b) => b.bookId));
  const memberWantToRead = await db.userBook.findMany({
    where: {
      userId: { in: memberIds },
      status: "WANT_TO_READ",
      bookId: { notIn: [...clubBookIds] },
    },
    include: {
      book: { include: { authors: { include: { author: true } } } },
      user: { select: { id: true, name: true } },
    },
  });

  const bookMatchMap = new Map<string, { book: (typeof memberWantToRead)[0]["book"]; members: Array<{ id: string; name: string | null }> }>();
  for (const ub of memberWantToRead) {
    if (!bookMatchMap.has(ub.bookId)) bookMatchMap.set(ub.bookId, { book: ub.book, members: [] });
    bookMatchMap.get(ub.bookId)!.members.push({ id: ub.userId, name: ub.user.name });
  }
  const matchedBooks = [...bookMatchMap.values()]
    .filter((m) => m.members.length >= 2)
    .sort((a, b) => b.members.length - a.members.length);

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
          {isOwner ? (
            <OwnerActions
              clubId={id}
              pendingTransfer={pendingTransfer}
              otherMembers={club.members
                .filter((m) => m.userId !== session.user!.id)
                .map((m) => ({ userId: m.userId, name: m.user.name }))}
            />
          ) : (
            <ClubActions clubId={id} isMember={!!myMembership} isOwner={false} isPublic={club.isPublic} />
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
        {/* Main column */}
        <div className="space-y-10">

          {/* ── Current book ── */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Current Book</h2>
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
                      {[...new Set(currentBook.book.authors.map((a) => a.author.name))].join(", ")}
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
                      <div className="mt-3 flex flex-wrap gap-2">
                        <SetCurrentBook clubId={id} bookId={currentBook.bookId} isCurrent={true} currentBook={null} />
                        <MarkCompleted clubId={id} bookId={currentBook.bookId} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Club notes */}
                {myMembership && (
                  <ClubBookNotes clubId={id} bookId={currentBook.bookId} initialNotes={currentBook.notes} />
                )}

                {/* Who's participating */}
                <div className="mt-6 border-t border-brand-100 pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Who's interested ({participants.length}/{club.members.length})
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
                <p className="text-gray-500">No current book selected.</p>
                {isAdmin && (
                  <p className="mt-1 text-sm text-gray-400">
                    Pick one from the queue or suggestions below, or{" "}
                    <Link href={`/search?clubId=${id}`} className="text-brand-600 hover:underline">add a book</Link>.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Queue ── */}
          {(queuedBooks.length > 0 || isAdmin) && (
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Queue</h2>
                <p className="mt-0.5 text-sm text-gray-400">
                  Next up, in order.{queuedBooks.length === 0 && " No books in the queue yet. Add one from suggestions below."}
                </p>
              </div>
              <QueuePanel
                clubId={id}
                books={queuedBooks.map((cb) => ({
                  bookId: cb.bookId,
                  title: cb.book.title,
                  coverUrl: cb.book.coverUrl,
                  authors: [...new Set(cb.book.authors.map((a) => a.author.name))],
                  addedAt: cb.addedAt.toISOString(),
                  suggestedByName: cb.selectedBy?.name ?? null,
                }))}
                isAdmin={isAdmin}
                currentBook={currentBook ? { bookId: currentBook.bookId, title: currentBook.book.title } : null}
              />
            </section>
          )}

          {/* ── Suggestions ── */}
          {(suggestedBooks.length > 0 || !!myMembership) && (
            <section>
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Suggestions</h2>
              <SuggestionsPanel
                clubId={id}
                books={suggestedBooks.map((cb) => ({
                  bookId: cb.bookId,
                  title: cb.book.title,
                  coverUrl: cb.book.coverUrl,
                  authors: [...new Set(cb.book.authors.map((a) => a.author.name))],
                  addedAt: cb.addedAt.toISOString(),
                  suggestedById: cb.selectedBy?.id ?? null,
                  suggestedByName: cb.selectedBy?.name ?? null,
                }))}
                isAdmin={isAdmin}
                isMember={!!myMembership}
                currentUserId={session.user!.id!}
                currentBook={currentBook ? { bookId: currentBook.bookId, title: currentBook.book.title } : null}
                existingBookIds={club.books.map((b) => b.bookId)}
              />
            </section>
          )}

          {/* ── Suggestion by match ── */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Suggestion by Match</h2>
              <p className="mt-0.5 text-sm text-gray-400">
                Books on multiple members' want-to-read lists.{matchedBooks.length === 0 && " No books in common among members yet."}
              </p>
            </div>
            {matchedBooks.length > 0 ? (
              <div className="space-y-4">
                {matchedBooks.map(({ book, members }) => (
                  <div key={book.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex gap-4">
                      {book.coverUrl ? (
                        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 shadow-sm">
                          <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="56px" />
                        </div>
                      ) : (
                        <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-2xl">📚</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <Link href={`/books/${book.id}`} className="font-semibold text-gray-900 hover:text-brand-700 line-clamp-2">
                          {book.title}
                        </Link>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {[...new Set(book.authors.map((a) => a.author.name))].join(", ")}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-medium text-brand-700 bg-brand-50 rounded-full px-2 py-0.5">
                            {members.length}/{club.members.length} members
                          </span>
                          {members.map((m) => (
                            <span key={m.id} className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                              {m.name ?? "Unknown"}
                            </span>
                          ))}
                        </div>
                        {isAdmin && (
                          <div className="mt-3">
                            <SetMatchedBookCurrent clubId={id} bookId={book.id} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {/* ── Past reads ── */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Past Reads</h2>
            {pastBooks.length > 0 ? (
              <div className="space-y-3">
                {pastBooks.map((cb) => (
                  <div key={cb.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <BookCard book={cb.book} />
                    <p className="mt-1 text-xs text-gray-400">
                      {cb.meetingDate && new Date(cb.meetingDate) < now
                        ? `Met ${new Date(cb.meetingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                        : `Completed ${new Date(cb.completedAt!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                    </p>
                    {myMembership && (
                      <ClubBookNotes clubId={id} bookId={cb.bookId} initialNotes={cb.notes} />
                    )}
                    {isAdmin && (
                      <div className="mt-2">
                        <RestoreBook
                          clubId={id}
                          bookId={cb.bookId}
                          currentBook={currentBook ? { bookId: currentBook.bookId, title: currentBook.book.title } : null}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Past book club selections will appear here.</p>
            )}
          </section>

          {/* ── Settings ── */}
          {isOwner && (
            <ClubSettings clubId={id} defaultRole={club.defaultRole} />
          )}

        </div>

        {/* Members sidebar */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Members</h2>
          <div className="space-y-3">
            {club.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-2">
                <Link href={`/profile/${m.user.username ?? m.userId}`} className="shrink-0 hover:opacity-80">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
                    {m.user.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/profile/${m.user.username ?? m.userId}`} className="hover:opacity-80">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.user.name}</p>
                  </Link>
                  {isOwner && m.userId !== session.user!.id ? (
                    <SetMemberRole clubId={id} userId={m.userId} role={m.role} />
                  ) : (
                    m.role !== "MEMBER" && (
                      <p className="text-xs text-gray-400 capitalize">{m.role.toLowerCase()}</p>
                    )
                  )}
                </div>
                {isOwner && m.userId !== session.user!.id && (
                  <RemoveMember clubId={id} userId={m.userId} name={m.user.name} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
