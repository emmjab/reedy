import { NextResponse } from "next/server";
import { z } from "zod";
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
    create: { clubId, userId: session.user.id!, role: club.defaultRole },
    update: {},
  });

  return NextResponse.json(membership, { status: 201 });
}

// Transfer ownership to another member, then remove self
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  const userId = session.user.id!;

  const membership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });
  if (membership?.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.object({ newOwnerId: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { newOwnerId } = parsed.data;

  await db.$transaction([
    db.bookClubMember.update({
      where: { clubId_userId: { clubId, userId: newOwnerId } },
      data: { role: "OWNER" },
    }),
    db.bookClubMember.delete({
      where: { clubId_userId: { clubId, userId } },
    }),
  ]);

  return new NextResponse(null, { status: 204 });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  const userId = session.user.id!;

  const membership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });
  if (membership?.role === "OWNER") {
    return NextResponse.json({ error: "Transfer ownership before leaving" }, { status: 403 });
  }

  await db.bookClubMember.delete({
    where: { clubId_userId: { clubId, userId } },
  });
  return new NextResponse(null, { status: 204 });
}
