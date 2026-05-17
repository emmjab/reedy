import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// Accept a pending request (only the recipient can accept)
export async function PATCH(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id!;

  const friendship = await db.friendship.findUnique({ where: { id } });
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (friendship.toUserId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (friendship.status !== "PENDING") return NextResponse.json({ error: "Already resolved" }, { status: 409 });

  const updated = await db.friendship.update({ where: { id }, data: { status: "ACCEPTED" } });
  return NextResponse.json(updated);
}

// Decline a pending request or remove an accepted friendship (either party)
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = session.user.id!;

  const friendship = await db.friendship.findUnique({ where: { id } });
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (friendship.fromUserId !== userId && friendship.toUserId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.friendship.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
