import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
});

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId } = await params;
  const discussions = await db.clubDiscussion.findMany({
    where: { clubId },
    include: {
      user: { select: { id: true, name: true, image: true } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(discussions);
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
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const discussion = await db.clubDiscussion.create({
    data: { clubId, userId: session.user.id!, ...parsed.data },
    include: { user: { select: { id: true, name: true, image: true } }, _count: { select: { comments: true } } },
  });

  return NextResponse.json(discussion, { status: 201 });
}
