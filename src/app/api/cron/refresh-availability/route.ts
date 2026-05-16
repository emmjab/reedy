import { NextResponse } from "next/server";
import { refreshStaleAvailability } from "@/lib/api/library";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refreshed = await refreshStaleAvailability();
  return NextResponse.json({ refreshed });
}
