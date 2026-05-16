import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; bookId: string }> };

const schema = z.object({
  isCurrent: z.boolean().optional(),
  meetingDate: z.string().datetime().optional().nullable(),
});

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId, bookId } = await params;

  const membership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId: session.user.id! } },
  });
  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { isCurrent, meetingDate } = parsed.data;

  // Setting a new current book: clear the previous one first
  if (isCurrent) {
    await db.$transaction([
      db.bookClubBook.updateMany({ where: { clubId, isCurrent: true }, data: { isCurrent: false } }),
      db.bookClubBook.update({ where: { clubId_bookId: { clubId, bookId } }, data: { isCurrent: true } }),
    ]);
  }

  const updated = await db.bookClubBook.update({
    where: { clubId_bookId: { clubId, bookId } },
    data: {
      ...(isCurrent !== undefined ? { isCurrent } : {}),
      ...(meetingDate !== undefined ? { meetingDate: meetingDate ? new Date(meetingDate) : null } : {}),
    },
    include: { book: { include: { authors: { include: { author: true } } } } },
  });

  return NextResponse.json(updated);
}
