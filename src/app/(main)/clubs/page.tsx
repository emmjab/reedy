import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClubCard } from "@/components/clubs/ClubCard";
import { JoinClubButton } from "@/components/clubs/JoinClubButton";
import { TransferNotification } from "@/components/clubs/TransferNotification";
import { Button } from "@/components/ui/button";

export default async function ClubsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [myClubs, archivedClubs, publicClubs, incomingTransfers] = await Promise.all([
    db.bookClub.findMany({
      where: { isArchived: false, members: { some: { userId: session.user.id! } } },
      include: {
        _count: { select: { members: true, books: true, discussions: true } },
        members: { where: { userId: session.user.id! }, select: { role: true } },
      },
    }),
    db.bookClub.findMany({
      where: { isArchived: true, members: { some: { userId: session.user.id! } } },
      include: {
        _count: { select: { members: true, books: true, discussions: true } },
        members: { where: { userId: session.user.id! }, select: { role: true } },
      },
    }),
    db.bookClub.findMany({
      where: { isPublic: true, isArchived: false, members: { none: { userId: session.user.id! } } },
      include: { _count: { select: { members: true, books: true, discussions: true } } },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
    db.clubOwnershipTransfer.findMany({
      where: { toUserId: session.user.id!, status: "PENDING" },
      include: {
        club: {
          include: {
            members: { include: { user: { select: { id: true, name: true } } } },
          },
        },
        fromUser: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Book Clubs</h1>
        <Link href="/clubs/new"><Button>+ Create new book club</Button></Link>
      </div>

      {incomingTransfers.length > 0 && (
        <section className="mt-8 space-y-3">
          {incomingTransfers.map((t) => {
            const eligibleMembers = t.club.members
              .filter((m) => m.userId !== t.fromUserId && m.userId !== session.user!.id)
              .map((m) => ({ userId: m.userId, name: m.user.name }));
            return (
              <TransferNotification
                key={t.id}
                transferId={t.id}
                clubId={t.clubId}
                clubName={t.club.name}
                fromName={t.fromUser.name}
                eligibleMembers={eligibleMembers}
              />
            );
          })}
        </section>
      )}

      {myClubs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Your book clubs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {myClubs.map((club) => <ClubCard key={club.id} club={club} />)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Discover book clubs</h2>
        {publicClubs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {publicClubs.map((club) => (
              <ClubCard key={club.id} club={club} action={<JoinClubButton clubId={club.id} />} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No other book clubs available to join!</p>
        )}
      </section>

      {archivedClubs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-400">Archived</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60">
            {archivedClubs.map((club) => <ClubCard key={club.id} club={club} />)}
          </div>
        </section>
      )}
    </div>
  );
}
