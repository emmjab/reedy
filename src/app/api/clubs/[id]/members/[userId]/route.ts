import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId, userId: targetUserId } = await params;
  const callerId = session.user.id!;

  if (targetUserId === callerId) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const callerMembership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId: callerId } },
  });
  if (callerMembership?.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = z.object({ role: z.enum(["MEMBER", "ADMIN"]) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await db.bookClubMember.update({
    where: { clubId_userId: { clubId, userId: targetUserId } },
    data: { role: parsed.data.role },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId, userId: targetUserId } = await params;
  const callerId = session.user.id!;

  const [callerMembership, targetMembership] = await Promise.all([
    db.bookClubMember.findUnique({ where: { clubId_userId: { clubId, userId: callerId } } }),
    db.bookClubMember.findUnique({ where: { clubId_userId: { clubId, userId: targetUserId } } }),
  ]);

  if (callerMembership?.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!targetMembership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (targetMembership.role === "OWNER") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 403 });
  }

  await db.bookClubMember.delete({ where: { clubId_userId: { clubId, userId: targetUserId } } });
  return new NextResponse(null, { status: 204 });
}
