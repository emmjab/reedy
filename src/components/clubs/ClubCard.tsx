import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { BookClub, ClubRole } from "@/types";

interface ClubCardProps {
  club: BookClub & {
    _count: { members: number; books: number; discussions: number };
    members?: Array<{ role: ClubRole }>;
  };
  action?: React.ReactNode;
}

export function ClubCard({ club, action }: ClubCardProps) {
  const myRole = club.members?.[0]?.role;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/clubs/${club.id}`} className="group block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 group-hover:text-brand-600">{club.name}</p>
            {club.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{club.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {myRole && (
              <Badge variant={myRole === "OWNER" ? "info" : "default"}>
                {myRole === "OWNER" ? "Owner" : myRole === "ADMIN" ? "Admin" : "Member"}
              </Badge>
            )}
            {!club.isPublic && <Badge variant="default">Private</Badge>}
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          <span>{club._count.members} {club._count.members === 1 ? "member" : "members"}</span>
          <span>{club._count.books} {club._count.books === 1 ? "book" : "books"}</span>
          <span>{club._count.discussions} {club._count.discussions === 1 ? "discussion" : "discussions"}</span>
        </div>
      </Link>
      {action && <div className="border-t border-gray-100 px-5 py-3">{action}</div>}
    </div>
  );
}
