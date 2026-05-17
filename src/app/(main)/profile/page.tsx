import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function MyProfileRedirect() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id! },
    select: { username: true },
  });

  if (user?.username) {
    redirect(`/profile/${user.username}`);
  } else {
    redirect(`/profile/${session.user.id}`);
  }
}
