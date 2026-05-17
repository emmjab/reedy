import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ transferId: string }> };

// Accept or pass/decline ownership transfer
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transferId } = await params;
  const userId = session.user.id!;

  const transfer = await db.clubOwnershipTransfer.findUnique({
    where: { id: transferId },
    include: {
      club: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (transfer.toUserId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (transfer.status !== "PENDING") return NextResponse.json({ error: "Transfer already resolved" }, { status: 409 });

  const body = await req.json();
  const parsed = z.object({
    action: z.enum(["accept", "decline"]),
    nextUserId: z.string().optional(),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { action, nextUserId } = parsed.data;

  if (action === "accept") {
    await db.$transaction([
      db.clubOwnershipTransfer.update({ where: { id: transferId }, data: { status: "ACCEPTED" } }),
      db.bookClubMember.update({
        where: { clubId_userId: { clubId: transfer.clubId, userId } },
        data: { role: "OWNER" },
      }),
      transfer.leaveAfter
        ? db.bookClubMember.delete({
            where: { clubId_userId: { clubId: transfer.clubId, userId: transfer.fromUserId } },
          })
        : db.bookClubMember.update({
            where: { clubId_userId: { clubId: transfer.clubId, userId: transfer.fromUserId } },
            data: { role: "MEMBER" },
          }),
    ]);
    return new NextResponse(null, { status: 204 });
  }

  // action === "decline"
  await db.clubOwnershipTransfer.update({ where: { id: transferId }, data: { status: "DECLINED" } });

  if (nextUserId) {
    // Validate nextUserId is a member (and not the original owner or self)
    const nextMembership = await db.bookClubMember.findUnique({
      where: { clubId_userId: { clubId: transfer.clubId, userId: nextUserId } },
    });
    if (!nextMembership || nextUserId === transfer.fromUserId || nextUserId === userId) {
      return NextResponse.json({ error: "Invalid next recipient" }, { status: 400 });
    }

    const next = await db.clubOwnershipTransfer.create({
      data: { clubId: transfer.clubId, fromUserId: transfer.fromUserId, toUserId: nextUserId },
      include: { toUser: { select: { name: true } } },
    });
    return NextResponse.json(next, { status: 201 });
  }

  // No one left — archive the club
  await db.bookClub.update({
    where: { id: transfer.clubId },
    data: { isArchived: true, archivedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}

// Owner cancels a pending transfer they initiated
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { transferId } = await params;
  const userId = session.user.id!;

  const transfer = await db.clubOwnershipTransfer.findUnique({ where: { id: transferId } });
  if (!transfer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (transfer.fromUserId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (transfer.status !== "PENDING") return NextResponse.json({ error: "Transfer already resolved" }, { status: 409 });

  await db.clubOwnershipTransfer.update({ where: { id: transferId }, data: { status: "DECLINED" } });
  return new NextResponse(null, { status: 204 });
}
