import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine") === "true";

  const clubs = await db.bookClub.findMany({
    where: mine
      ? { members: { some: { userId: session.user.id! } } }
      : { isPublic: true },
    include: {
      _count: { select: { members: true, books: true, discussions: true } },
      members: {
        where: { userId: session.user.id! },
        select: { role: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(clubs);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const club = await db.bookClub.create({
    data: {
      ...parsed.data,
      members: {
        create: { userId: session.user.id!, role: "OWNER" },
      },
    },
    include: { _count: { select: { members: true, books: true, discussions: true } } },
  });

  return NextResponse.json(club, { status: 201 });
}
