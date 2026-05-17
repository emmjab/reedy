import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { NotificationBell } from "@/components/layout/NotificationBell";

export async function Navbar() {
  const session = await auth();

  const userId = session?.user?.id;
  const [friendRequests, transfers] = userId
    ? await Promise.all([
        db.friendship.findMany({
          where: { toUserId: userId, status: "PENDING" },
          select: { id: true, fromUser: { select: { id: true, name: true, username: true } } },
        }),
        db.clubOwnershipTransfer.findMany({
          where: { toUserId: userId, status: "PENDING" },
          select: { id: true, club: { select: { id: true, name: true } }, fromUser: { select: { name: true } } },
        }),
      ])
    : [[], []];

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 font-bold text-brand-700 text-lg">
          <span>📚</span>
          <span>Reedy</span>
        </Link>

        {session ? (
          <div className="flex items-center gap-3">
            <Link href="/search" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">Search</Link>
            <Link href="/shelf" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">Shelf</Link>
            <Link href="/clubs" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">Book Clubs</Link>
            <Link href="/friends" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">Friends</Link>
            <NotificationBell friendRequests={friendRequests} transfers={transfers} />
            <Link href="/profile">
              {session.user?.image ? (
                <Image src={session.user.image} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
                  {session.user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </Link>
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get started</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
