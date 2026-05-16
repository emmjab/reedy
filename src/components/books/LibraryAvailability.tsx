"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { LibraryAvailabilityResult } from "@/types";

const SYSTEM_NAMES: Record<string, string> = {
  BPL: "Brooklyn Public Library",
  NYPL: "New York Public Library",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "danger" | "default" }> = {
  AVAILABLE: { label: "Available", variant: "success" },
  ON_HOLD: { label: "On Hold", variant: "warning" },
  CHECKED_OUT: { label: "Checked Out", variant: "danger" },
  UNAVAILABLE: { label: "Not in Collection", variant: "default" },
  UNKNOWN: { label: "Check Catalog", variant: "default" },
};

interface LibraryAvailabilityProps {
  bookId: string;
}

export function LibraryAvailability({ bookId }: LibraryAvailabilityProps) {
  const [results, setResults] = useState<LibraryAvailabilityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}/availability`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setResults)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {["BPL", "NYPL"].map((sys) => (
          <div key={sys} className="h-16 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error || results.length === 0) {
    return <p className="text-sm text-gray-500">Library data unavailable. Try the catalog links directly.</p>;
  }

  const bySystem = results.reduce<Record<string, LibraryAvailabilityResult[]>>((acc, r) => {
    const key = r.system as string;
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.entries(bySystem).map(([system, items]) => {
        const main = items[0];
        const config = STATUS_CONFIG[main.status] ?? STATUS_CONFIG.UNKNOWN;
        return (
          <div key={system} className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{SYSTEM_NAMES[system] ?? system}</p>
                {main.holdCount != null && main.holdCount > 0 && (
                  <p className="mt-0.5 text-sm text-gray-500">
                    {main.holdCount} {main.holdCount === 1 ? "hold" : "holds"}
                    {main.estimatedWaitDays != null && ` · ~${Math.ceil(main.estimatedWaitDays / 7)} week wait`}
                  </p>
                )}
                {main.status === "AVAILABLE" && (
                  <p className="mt-0.5 text-sm text-green-600">Ready to check out</p>
                )}
              </div>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            {main.sourceUrl && (
              <a
                href={main.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-brand-600 hover:underline"
              >
                View in catalog →
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
