import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; discussionId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: clubId, discussionId } = await params;

  const discussion = await db.clubDiscussion.findUnique({
    where: { id: discussionId },
    include: {
      user: { select: { id: true, name: true, image: true } },
      comments: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "asc" },
      },
      club: { select: { id: true, name: true } },
    },
  });

  if (!discussion || discussion.clubId !== clubId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(discussion);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { discussionId } = await params;

  const discussion = await db.clubDiscussion.findUnique({ where: { id: discussionId } });
  if (!discussion) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (discussion.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.clubDiscussion.delete({ where: { id: discussionId } });
  return new NextResponse(null, { status: 204 });
}
