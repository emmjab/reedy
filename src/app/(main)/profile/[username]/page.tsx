import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { BookCard } from "@/components/books/BookCard";
import { ClubCard } from "@/components/clubs/ClubCard";
import { AccountActions } from "@/components/user/AccountActions";
import { FriendButton } from "@/components/friends/FriendButton";
import { PrivacySettings } from "@/components/friends/PrivacySettings";
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
        where: { club: { isArchived: false } },
        include: {
          club: { include: { _count: { select: { members: true, books: true, discussions: true } } } },
        },
      },
    },
  });

  if (!user) notFound();

  const isOwnProfile = session?.user?.id === user.id;

  // Friendship state between viewer and profile owner
  const friendship = (!isOwnProfile && session?.user)
    ? await db.friendship.findFirst({
        where: {
          OR: [
            { fromUserId: session.user.id!, toUserId: user.id },
            { fromUserId: user.id, toUserId: session.user.id! },
          ],
        },
      })
    : null;

  const isFriend = friendship?.status === "ACCEPTED";

  // Determine friend state for the button
  type FriendState =
    | { type: "none" }
    | { type: "sent"; id: string }
    | { type: "received"; id: string }
    | { type: "friends"; id: string };

  let friendState: FriendState = { type: "none" };
  if (friendship) {
    if (friendship.status === "ACCEPTED") {
      friendState = { type: "friends", id: friendship.id };
    } else if (friendship.fromUserId === session?.user?.id) {
      friendState = { type: "sent", id: friendship.id };
    } else {
      friendState = { type: "received", id: friendship.id };
    }
  }

  // Pending friend requests sent to the viewer (own profile only)
  const pendingRequests = isOwnProfile
    ? await db.friendship.findMany({
        where: { toUserId: session!.user!.id!, status: "PENDING" },
        include: { fromUser: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const byStatus = user.userBooks.reduce<Record<string, typeof user.userBooks>>((acc, ub) => {
    (acc[ub.status] ??= []).push(ub);
    return acc;
  }, {});

  const counts = {
    READ: byStatus["READ"]?.length ?? 0,
    READING: byStatus["READING"]?.length ?? 0,
    WANT_TO_READ: byStatus["WANT_TO_READ"]?.length ?? 0,
  };

  const stats = [
    { label: "Finished", count: counts.READ },
    { label: "Reading", count: counts.READING },
    { label: "Want to read", count: counts.WANT_TO_READ },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
            {user.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            {user.username && <p className="text-sm text-gray-400">@{user.username}</p>}
          </div>
        </div>
        {!isOwnProfile && session?.user && (
          <div className="shrink-0 pt-1">
            <FriendButton toUserId={user.id} initialState={friendState} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-900">{s.count}</p>
            <p className="mt-1 text-sm text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Friend-gated content */}
      {isFriend && (
        <>
          {user.friendsCanSeeReading && (byStatus["READING"]?.length ?? 0) > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Currently Reading</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {byStatus["READING"].map((ub) => (
                  <BookCard key={ub.bookId} book={ub.book} userBook={ub} />
                ))}
              </div>
            </section>
          )}

          {user.friendsCanSeeRead && (byStatus["READ"]?.length ?? 0) > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Recently Finished</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byStatus["READ"].slice(0, 6).map((ub) => (
                  <BookCard key={ub.bookId} book={ub.book} userBook={ub} />
                ))}
              </div>
            </section>
          )}

          {user.friendsCanSeeWantTo && (byStatus["WANT_TO_READ"]?.length ?? 0) > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Want to Read</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byStatus["WANT_TO_READ"].slice(0, 6).map((ub) => (
                  <BookCard key={ub.bookId} book={ub.book} userBook={ub} />
                ))}
              </div>
            </section>
          )}

          {user.friendsCanSeeClubs && user.clubMemberships.filter((m) => m.club.isPublic).length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Book Clubs</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {user.clubMemberships
                  .filter((m) => m.club.isPublic)
                  .map((m) => (
                    <ClubCard key={m.clubId} club={{ ...m.club, members: [{ role: m.role }] }} />
                  ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Own profile: pending requests + account */}
      {isOwnProfile && (
        <>
          {pendingRequests.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-lg font-semibold text-gray-800">Friend Requests</h2>
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div>
                      <p className="font-medium text-gray-900">{req.fromUser.name}</p>
                      {req.fromUser.username && (
                        <p className="text-xs text-gray-400">@{req.fromUser.username}</p>
                      )}
                    </div>
                    <FriendButton
                      toUserId={req.fromUser.id}
                      initialState={{ type: "received", id: req.id }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Privacy</h2>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <PrivacySettings
                initial={{
                  friendsCanSeeReading: user.friendsCanSeeReading,
                  friendsCanSeeRead: user.friendsCanSeeRead,
                  friendsCanSeeWantTo: user.friendsCanSeeWantTo,
                  friendsCanSeeClubs: user.friendsCanSeeClubs,
                }}
              />
            </div>
          </section>

          <section className="mt-10">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Account</h2>
            <AccountActions />
          </section>
        </>
      )}
    </div>
  );
}
