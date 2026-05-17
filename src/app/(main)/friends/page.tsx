import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { UserSearch } from "@/components/friends/UserSearch";
import { FriendButton } from "@/components/friends/FriendButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;

  const friendships = await db.friendship.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    },
    include: {
      fromUser: { select: { id: true, name: true, username: true } },
      toUser:   { select: { id: true, name: true, username: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const accepted = friendships.filter((f) => f.status === "ACCEPTED");
  const sentPending = friendships.filter((f) => f.status === "PENDING" && f.fromUserId === userId);

  // Map of otherUserId → friendship info for UserSearch pre-population
  const friendshipMap: Record<string, { id: string; status: "PENDING" | "ACCEPTED"; isSender: boolean }> = {};
  for (const f of friendships) {
    const otherId = f.fromUserId === userId ? f.toUserId : f.fromUserId;
    friendshipMap[otherId] = { id: f.id, status: f.status, isSender: f.fromUserId === userId };
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Friends</h1>

      {/* Search */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Find people</h2>
        <UserSearch existingFriendships={friendshipMap} />
      </section>

      {/* Current friends */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Friends {accepted.length > 0 && <span className="text-sm font-normal text-gray-400">({accepted.length})</span>}
        </h2>
        {accepted.length > 0 ? (
          <div className="space-y-2">
            {accepted.map((f) => {
              const other = f.fromUserId === userId ? f.toUser : f.fromUser;
              return (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                  <Link href={`/profile/${other.username ?? other.id}`} className="hover:opacity-80">
                    <p className="font-medium text-gray-900">{other.name}</p>
                    {other.username && <p className="text-xs text-gray-400">@{other.username}</p>}
                  </Link>
                  <FriendButton toUserId={other.id} initialState={{ type: "friends", id: f.id }} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No friends yet — search above to find people.</p>
        )}
      </section>

      {/* Sent pending */}
      {sentPending.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">Pending requests</h2>
          <div className="space-y-2">
            {sentPending.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <Link href={`/profile/${f.toUser.username ?? f.toUser.id}`} className="hover:opacity-80">
                  <p className="font-medium text-gray-900">{f.toUser.name}</p>
                  {f.toUser.username && <p className="text-xs text-gray-400">@{f.toUser.username}</p>}
                </Link>
                <FriendButton toUserId={f.toUser.id} initialState={{ type: "sent", id: f.id }} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
