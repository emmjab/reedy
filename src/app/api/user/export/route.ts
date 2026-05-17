import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const RATING_LABEL: Record<string, string> = {
  GREAT: "Great!",
  GOOD: "Good",
  OK: "OK",
  MEH: "Meh",
  NAH: "Nah",
};

function escapeCell(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userBooks = await db.userBook.findMany({
    where: { userId: session.user.id! },
    include: { book: { include: { authors: { include: { author: true } } } } },
    orderBy: { updatedAt: "desc" },
  });

  const headers = ["Title", "Authors", "Published", "Status", "Rating", "Notes", "Started", "Finished", "Added"];
  const rows = userBooks.map((ub) => [
    escapeCell(ub.book.title),
    escapeCell([...new Set(ub.book.authors.map((a) => a.author.name))].join("; ")),
    escapeCell(ub.book.firstPublishYear?.toString() ?? null),
    escapeCell(ub.status.replace(/_/g, " ")),
    escapeCell(ub.rating ? RATING_LABEL[ub.rating] : null),
    escapeCell(ub.notes),
    escapeCell(ub.startedAt?.toISOString().slice(0, 10) ?? null),
    escapeCell(ub.finishedAt?.toISOString().slice(0, 10) ?? null),
    escapeCell(ub.createdAt.toISOString().slice(0, 10)),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="reedy-books-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
