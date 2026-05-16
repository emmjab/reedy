import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export async function Navbar() {
  const session = await auth();

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
            <Link href="/clubs" className="hidden text-sm text-gray-600 hover:text-gray-900 sm:block">Clubs</Link>
            <Link href="/dashboard">
              {session.user?.image ? (
                <Image src={session.user.image} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-700">
                  {session.user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
            </Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
            </form>
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
