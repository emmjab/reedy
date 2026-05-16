import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-gray-900">
        Track your reading.<br />
        <span className="text-brand-600">Find it at the library.</span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg text-gray-600">
        Reedy lets you manage your reading list and see real-time availability at Brooklyn Public Library and NYPL — so you never have to pay for a book you could borrow.
      </p>
      <div className="mt-10 flex justify-center gap-4">
        <Link href="/register"><Button size="lg">Get started — it's free</Button></Link>
        <Link href="/login"><Button variant="secondary" size="lg">Sign in</Button></Link>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-3">
        {[
          { emoji: "📚", title: "Track your books", body: "Want to read, currently reading, finished, or abandoned — keep it all in one place." },
          { emoji: "🏛️", title: "Library availability", body: "See live hold counts and estimated wait times from BPL and NYPL, right on every book page." },
          { emoji: "👥", title: "Book clubs", body: "Create groups, pick monthly reads, and discuss books together." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
            <p className="text-3xl">{f.emoji}</p>
            <p className="mt-3 font-semibold text-gray-900">{f.title}</p>
            <p className="mt-1 text-sm text-gray-500">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
