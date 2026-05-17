import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; bookId: string }> };

const schema = z.object({
  isCurrent: z.boolean().optional(),
  isQueued: z.boolean().optional(),
  meetingDate: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId, bookId } = await params;

  const membership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId: session.user.id! } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { isCurrent, isQueued, meetingDate, completedAt, notes } = parsed.data;

  // Non-admins can only update notes
  const isAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
  if (!isAdmin && (isCurrent !== undefined || isQueued !== undefined || meetingDate !== undefined || completedAt !== undefined)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await db.$transaction(async (tx) => {
    // Clear previous current book before setting a new one
    if (isCurrent) {
      await tx.bookClubBook.updateMany({
        where: { clubId, isCurrent: true },
        data: { isCurrent: false },
      });
    }

    // Marking completed clears isCurrent; setting current clears isQueued and completedAt
    const currentData = isCurrent
      ? { isCurrent: true, isQueued: false, completedAt: null }
      : isCurrent === false ? { isCurrent: false } : {};

    const completedData = completedAt !== undefined && !isCurrent
      ? { completedAt: completedAt ? new Date(completedAt) : null, isCurrent: false }
      : {};

    return tx.bookClubBook.update({
      where: { clubId_bookId: { clubId, bookId } },
      data: {
        ...currentData,
        ...(isQueued !== undefined && isCurrent !== true && { isQueued }),
        ...(meetingDate !== undefined && { meetingDate: meetingDate ? new Date(meetingDate) : null }),
        ...(notes !== undefined && { notes: notes ?? null }),
        ...completedData,
      },
      include: { book: { include: { authors: { include: { author: true } } } } },
    });
  });

  return NextResponse.json(updated);
}
