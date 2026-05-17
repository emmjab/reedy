import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;

  const membership = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId: session.user.id! } },
  });
  const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bookIds } = await req.json() as { bookIds: string[] };
  if (!Array.isArray(bookIds)) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await db.$transaction(
    bookIds.map((bookId, index) =>
      db.bookClubBook.update({
        where: { clubId_bookId: { clubId, bookId } },
        data: { queueOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
