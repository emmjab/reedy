import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookCard } from "@/components/books/BookCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubActions } from "@/components/clubs/ClubActions";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const club = await db.bookClub.findUnique({ where: { id }, select: { name: true } });
  return { title: club?.name ?? "Book Club" };
}

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

  const isOwner = myMembership?.role === "OWNER";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
          {club.description && <p className="mt-1 text-gray-500">{club.description}</p>}
          <div className="mt-2 flex gap-3 text-sm text-gray-400">
            <span>{club._count.members} members</span>
            <span>{club._count.books} books</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {myMembership && (
            <Badge variant={isOwner ? "info" : "default"}>
              {myMembership.role.charAt(0) + myMembership.role.slice(1).toLowerCase()}
            </Badge>
          )}
          <ClubActions
            clubId={id}
            isMember={!!myMembership}
            isOwner={isOwner}
            isPublic={club.isPublic}
          />
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <div>
          {/* Books */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Reading list</h2>
            {myMembership && (
              <Link href={`/search?clubId=${id}`}>
                <Button size="sm" variant="secondary">+ Add book</Button>
              </Link>
            )}
          </div>
          {club.books.length > 0 ? (
            <div className="space-y-3">
              {club.books.map((cb) => (
                <div key={cb.id}>
                  <BookCard book={cb.book} />
                  <div className="mt-1 ml-3 flex gap-3 text-xs text-gray-400">
                    {cb.selectedBy && <span>Added by {cb.selectedBy.name}</span>}
                    {cb.meetingDate && (
                      <span>
                        Meeting: {new Date(cb.meetingDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No books added yet.</p>
          )}

          {/* Discussions */}
          <div className="mt-10">
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
                      {d.user.name} · {d._count.comments} {d._count.comments === 1 ? "reply" : "replies"} ·{" "}
                      {new Date(d.createdAt).toLocaleDateString()}
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
          </div>
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
