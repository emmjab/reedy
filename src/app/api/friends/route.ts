import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = z.object({ toUserId: z.string() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const fromUserId = session.user.id!;
  const { toUserId } = parsed.data;

  if (fromUserId === toUserId) return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });

  // Check no existing relationship in either direction
  const existing = await db.friendship.findFirst({
    where: {
      OR: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    },
  });
  if (existing) return NextResponse.json({ error: "Friendship already exists" }, { status: 409 });

  const friendship = await db.friendship.create({
    data: { fromUserId, toUserId },
  });

  return NextResponse.json(friendship, { status: 201 });
}
