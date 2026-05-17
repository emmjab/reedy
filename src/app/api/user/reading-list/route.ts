import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ReadingStatus } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") as ReadingStatus | null;
  const statusesParam = searchParams.get("statuses");
  const statuses = statusesParam
    ? (statusesParam.split(",") as ReadingStatus[])
    : statusParam ? [statusParam] : null;

  const userBooks = await db.userBook.findMany({
    where: {
      userId: session.user.id!,
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    include: {
      book: {
        include: { authors: { include: { author: true } }, editions: { take: 1 } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(userBooks);
}
