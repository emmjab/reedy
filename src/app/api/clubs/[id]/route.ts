import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

async function requireOwner(clubId: string, userId: string) {
  const membership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });
  return membership?.role === "OWNER";
}

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

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  const isOwner = await requireOwner(clubId, session.user.id!);
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = z.object({
    isArchived: z.boolean().optional(),
    defaultRole: z.enum(["MEMBER", "ADMIN"]).optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.isArchived !== undefined) {
    data.isArchived = parsed.data.isArchived;
    data.archivedAt = parsed.data.isArchived ? new Date() : null;
  }
  if (parsed.data.defaultRole !== undefined) data.defaultRole = parsed.data.defaultRole;

  const club = await db.bookClub.update({ where: { id: clubId }, data });

  return NextResponse.json(club);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  const isOwner = await requireOwner(clubId, session.user.id!);
  if (!isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.bookClub.delete({ where: { id: clubId } });
  return new NextResponse(null, { status: 204 });
}
