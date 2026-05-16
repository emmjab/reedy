import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ShelfPanel } from "@/components/books/ShelfPanel";
import { AddToClub } from "@/components/books/AddToClub";
import { LibraryAvailability } from "@/components/books/LibraryAvailability";
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const book = await db.book.findUnique({ where: { id }, select: { title: true } });
  return { title: book?.title ?? "Book" };
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const book = await db.book.findUnique({
    where: { id },
    include: { authors: { include: { author: true } }, editions: true },
  });
  if (!book) notFound();

  const userBook = session?.user
    ? await db.userBook.findUnique({
        where: { userId_bookId: { userId: session.user.id!, bookId: id } },
      })
    : null;

  const authorNames = book.authors.map((ba) => ba.author.name).join(", ");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[200px_1fr]">
        {/* Cover */}
        <div className="relative h-72 w-48 overflow-hidden rounded-xl bg-gray-100 shadow-md">
          {book.coverUrl ? (
            <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="200px" priority />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-5xl">📚</div>
          )}
        </div>

        {/* Info */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
          {book.subtitle && <p className="mt-1 text-lg text-gray-500">{book.subtitle}</p>}
          {authorNames && <p className="mt-2 text-base text-gray-700">by {authorNames}</p>}
          {book.firstPublishYear && <p className="mt-1 text-sm text-gray-400">First published {book.firstPublishYear}</p>}

          {session?.user ? (
            <div className="mt-8 space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <ShelfPanel bookId={id} initialUserBook={userBook} />
              <AddToClub bookId={id} />
            </div>
          ) : (
            <p className="mt-6 text-sm text-gray-400">Sign in to track this book</p>
          )}

          {book.description && (
            <div className="mt-8">
              <h2 className="mb-2 font-semibold text-gray-800">About this book</h2>
              <p className="text-sm leading-relaxed text-gray-600 line-clamp-6">{book.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Library availability */}
      <div className="mt-12">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">NYC Library Availability</h2>
        <LibraryAvailability bookId={id} />
      </div>
    </div>
  );
}
