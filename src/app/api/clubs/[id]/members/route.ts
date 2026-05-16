import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  const club = await db.bookClub.findUnique({ where: { id: clubId } });
  if (!club) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!club.isPublic) return NextResponse.json({ error: "This club is invite-only" }, { status: 403 });

  const membership = await db.bookClubMember.upsert({
    where: { clubId_userId: { clubId, userId: session.user.id! } },
    create: { clubId, userId: session.user.id!, role: "MEMBER" },
    update: {},
  });

  return NextResponse.json(membership, { status: 201 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  await db.bookClubMember.delete({
    where: { clubId_userId: { clubId, userId: session.user.id! } },
  });
  return new NextResponse(null, { status: 204 });
}
