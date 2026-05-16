import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const club = await db.bookClub.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true, username: true } } } },
      books: {
        include: {
          book: { include: { authors: { include: { author: true } } } },
          selectedBy: { select: { id: true, name: true } },
        },
        orderBy: { addedAt: "desc" },
      },
      discussions: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { members: true, books: true, discussions: true } },
    },
  });

  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isMember = club.members.some((m) => m.userId === session.user!.id);
  if (!club.isPublic && !isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(club);
}
