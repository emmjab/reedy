import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ClubCard } from "@/components/clubs/ClubCard";
import { JoinClubButton } from "@/components/clubs/JoinClubButton";
import { Button } from "@/components/ui/button";

export default async function ClubsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [myClubs, publicClubs] = await Promise.all([
    db.bookClub.findMany({
      where: { members: { some: { userId: session.user.id! } } },
      include: {
        _count: { select: { members: true, books: true, discussions: true } },
        members: { where: { userId: session.user.id! }, select: { role: true } },
      },
    }),
    db.bookClub.findMany({
      where: { isPublic: true, members: { none: { userId: session.user.id! } } },
      include: { _count: { select: { members: true, books: true, discussions: true } } },
      take: 20,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Book Clubs</h1>
        <Link href="/clubs/new"><Button>+ New club</Button></Link>
      </div>

      {myClubs.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Your clubs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {myClubs.map((club) => <ClubCard key={club.id} club={club} />)}
          </div>
        </section>
      )}

      {publicClubs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Discover clubs</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {publicClubs.map((club) => (
              <ClubCard key={club.id} club={club} action={<JoinClubButton clubId={club.id} />} />
            ))}
          </div>
        </section>
      )}

      {myClubs.length === 0 && publicClubs.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-4xl">👥</p>
          <p className="mt-4 font-medium text-gray-700">No clubs yet</p>
          <Link href="/clubs/new" className="mt-6 inline-block"><Button>Create the first one</Button></Link>
        </div>
      )}
    </div>
  );
}
