import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// Owner nominates a member to take ownership
export async function POST(req: Request, { params }: Params) {
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
  const parsed = z.object({ toUserId: z.string(), leaveAfter: z.boolean().default(true) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { toUserId, leaveAfter } = parsed.data;

  // Verify the target is a member of the club
  const targetMembership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId: toUserId } },
  });
  if (!targetMembership) {
    return NextResponse.json({ error: "User is not a member of this club" }, { status: 400 });
  }

  // Cancel any existing pending transfer for this club from this owner
  await db.clubOwnershipTransfer.updateMany({
    where: { clubId, fromUserId: userId, status: "PENDING" },
    data: { status: "DECLINED" },
  });

  const transfer = await db.clubOwnershipTransfer.create({
    data: { clubId, fromUserId: userId, toUserId, leaveAfter },
    include: { toUser: { select: { name: true } } },
  });

  return NextResponse.json(transfer, { status: 201 });
}
