import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const addBookSchema = z.object({
  bookId: z.string(),
  meetingDate: z.string().datetime().optional(),
});

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;

  const books = await db.bookClubBook.findMany({
    where: { clubId },
    select: { book: { select: { openLibraryWorkId: true, googleBooksId: true } } },
  });

  const externalIds = books.flatMap(({ book }) =>
    [book.openLibraryWorkId, book.googleBooksId].filter(Boolean)
  );

  return NextResponse.json(externalIds);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;

  const isMember = await db.bookClubMember.findUnique({
    where: { clubId_userId: { clubId, userId: session.user.id! } },
  });
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = addBookSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const clubBook = await db.bookClubBook.upsert({
    where: { clubId_bookId: { clubId, bookId: parsed.data.bookId } },
    create: {
      clubId,
      bookId: parsed.data.bookId,
      selectedByUserId: session.user.id!,
      meetingDate: parsed.data.meetingDate ? new Date(parsed.data.meetingDate) : undefined,
    },
    update: {
      meetingDate: parsed.data.meetingDate ? new Date(parsed.data.meetingDate) : undefined,
    },
    include: { book: { include: { authors: { include: { author: true } } } } },
  });

  return NextResponse.json(clubBook, { status: 201 });
}

export async function DELETE(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

  const [membership, clubBook] = await Promise.all([
    db.bookClubMember.findUnique({
      where: { clubId_userId: { clubId, userId: session.user.id! } },
    }),
    db.bookClubBook.findUnique({
      where: { clubId_bookId: { clubId, bookId } },
      select: { selectedByUserId: true, isQueued: true, isCurrent: true },
    }),
  ]);

  const isAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN";
  const isOwnSuggestion = clubBook?.selectedByUserId === session.user.id! && !clubBook?.isQueued && !clubBook?.isCurrent;

  if (!membership || (!isAdmin && !isOwnSuggestion)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.bookClubBook.delete({ where: { clubId_bookId: { clubId, bookId } } });
  return new NextResponse(null, { status: 204 });
}
