import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.user.delete({ where: { id: session.user.id! } });

  // Sign out after deletion
  await signOut({ redirect: false });

  return new NextResponse(null, { status: 204 });
}
