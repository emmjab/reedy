import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailability } from "@/lib/api/library";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const availability = await getAvailability(id);
  return NextResponse.json(availability);
}
