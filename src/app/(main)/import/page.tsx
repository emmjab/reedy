"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ReadingStatus, BookRating } from "@prisma/client";

interface ImportRow {
  title: string;
  author: string;
  isbn13?: string;
  isbn10?: string;
  status: ReadingStatus;
  rating: BookRating | null;
  dateRead: string | null;
}

const SHELF_MAP: Record<string, ReadingStatus> = {
  "read": "READ",
  "currently-reading": "READING",
  "to-read": "WANT_TO_READ",
};

const RATING_MAP: Record<number, BookRating | null> = {
  5: "GREAT",
  4: "GOOD",
  3: "OK",
  2: "MEH",
  1: "NAH",
  0: null,
};

const RATING_LABEL: Record<string, string> = {
  GREAT: "great!",
  GOOD: "good",
  OK: "ok",
  MEH: "meh",
  NAH: "nah",
};

const STATUS_LABEL: Record<ReadingStatus, string> = {
  READ: "Read",
  READING: "Reading",
  WANT_TO_READ: "Want to read",
  ABANDONED: "Abandoned",
};

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseGoodreadsCSV(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCSVRow(lines[0]).map((h) => h.trim());

  return lines.slice(1).flatMap((line) => {
    if (!line.trim()) return [];
    const values = parseCSVRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim(); });

    const shelf = row["Exclusive Shelf"] ?? "";
    const status = SHELF_MAP[shelf];
    if (!status) return [];

    // Goodreads ISBNs come wrapped like ="9781234567890"
    const cleanIsbn = (raw: string) => raw.replace(/[^0-9Xx]/g, "");
    const isbn13 = cleanIsbn(row["ISBN13"] ?? "");
    const isbn10 = cleanIsbn(row["ISBN"] ?? "");
    const stars = parseInt(row["My Rating"] ?? "0", 10);

    return [{
      title: row["Title"] ?? "",
      author: row["Author"] ?? "",
      isbn13: isbn13.length === 13 ? isbn13 : undefined,
      isbn10: isbn10.length === 10 ? isbn10 : undefined,
      status,
      rating: RATING_MAP[stars] ?? null,
      dateRead: row["Date Read"] || null,
    }];
  });
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseGoodreadsCSV(text);
      if (parsed.length === 0) {
        setError("No valid books found. Make sure this is a Goodreads export CSV.");
      } else {
        setRows(parsed);
        setError("");
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!rows) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/import/goodreads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      if (!res.ok) throw new Error("Import failed");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
          <p className="text-4xl">📚</p>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Import complete</h1>
          <p className="mt-2 text-gray-500">
            {result.imported} book{result.imported !== 1 ? "s" : ""} imported
            {result.failed > 0 && `, ${result.failed} couldn't be found and were skipped`}.
          </p>
          <Button className="mt-8" onClick={() => router.push("/shelf")}>Go to my shelf</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Import from Goodreads</h1>
      <p className="mt-1 text-sm text-gray-500">
        Export your library from Goodreads (My Books → Import/Export → Export Library), then upload the CSV here.
      </p>

      {!rows ? (
        <div className="mt-8">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center transition hover:border-brand-400 hover:bg-brand-50">
            <span className="text-4xl">📄</span>
            <span className="font-medium text-gray-700">Click to upload your Goodreads CSV</span>
            <span className="text-sm text-gray-400">goodreads_library_export.csv</span>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </label>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">{rows.length} books found</p>
            <button
              onClick={() => { setRows(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              Choose a different file
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="max-h-[480px] overflow-x-auto overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="hidden px-4 py-3 text-left sm:table-cell">Author</th>
                    <th className="px-4 py-3 text-left">Shelf</th>
                    <th className="px-4 py-3 text-left">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.title}
                        <p className="text-xs font-normal text-gray-400 sm:hidden">{row.author}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-gray-500 sm:table-cell">{row.author}</td>
                      <td className="px-4 py-3 text-gray-500">{STATUS_LABEL[row.status]}</td>
                      <td className="px-4 py-3 text-gray-500">{row.rating ? RATING_LABEL[row.rating] : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center gap-4">
            <Button onClick={handleImport} loading={loading}>
              {loading ? "Importing…" : `Import ${rows.length} books`}
            </Button>
            <p className="text-xs text-gray-400">
              Books already on your shelf will have their status and rating updated.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
