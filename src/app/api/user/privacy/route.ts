import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  friendsCanSeeReading: z.boolean().optional(),
  friendsCanSeeRead:    z.boolean().optional(),
  friendsCanSeeWantTo:  z.boolean().optional(),
  friendsCanSeeClubs:   z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await db.user.update({
    where: { id: session.user.id! },
    data: parsed.data,
    select: {
      friendsCanSeeReading: true,
      friendsCanSeeRead: true,
      friendsCanSeeWantTo: true,
      friendsCanSeeClubs: true,
    },
  });

  return NextResponse.json(user);
}
