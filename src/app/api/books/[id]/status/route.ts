import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReadingStatus, BookRating } from "@prisma/client";

const schema = z.object({
  status: z.nativeEnum(ReadingStatus),
  rating: z.nativeEnum(BookRating).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  finishedAt: z.string().datetime().optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userBook = await db.userBook.findUnique({
    where: { userId_bookId: { userId: session.user.id!, bookId: id } },
  });
  if (!userBook) return NextResponse.json(null);
  return NextResponse.json(userBook);
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { status, rating, notes, startedAt, finishedAt } = parsed.data;

  const userBook = await db.userBook.upsert({
    where: { userId_bookId: { userId: session.user.id!, bookId } },
    create: {
      userId: session.user.id!,
      bookId,
      status,
      rating,
      notes,
      startedAt: startedAt ? new Date(startedAt) : undefined,
      finishedAt: finishedAt ? new Date(finishedAt) : undefined,
    },
    update: {
      status,
      rating,
      notes,
      startedAt: startedAt ? new Date(startedAt) : null,
      finishedAt: finishedAt ? new Date(finishedAt) : null,
    },
  });

  return NextResponse.json(userBook);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bookId } = await params;
  await db.userBook.delete({
    where: { userId_bookId: { userId: session.user.id!, bookId } },
  });
  return new NextResponse(null, { status: 204 });
}
