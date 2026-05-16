import type { LibraryAvailabilityResult } from "@/types";
import { AvailabilityStatus } from "@prisma/client";

// Brooklyn Public Library uses BiblioCommons
// Public search API returns JSON with availability info
const BPL_CATALOG = "https://bklynlibrary.bibliocommons.com";
const BPL_API = "https://gateway.bibliocommons.com/v2/libraries/bklynlibrary";

interface BiblioSearchDoc {
  id: string;
  title: string;
  brief_info: {
    call_number?: string;
  };
  availability: {
    available_copies: number;
    total_copies: number;
    holds?: number;
  };
}

interface BiblioSearchResponse {
  entities?: {
    bibs?: Record<string, BiblioSearchDoc>;
    bibItems?: Record<string, { availability_status?: string }>;
  };
  borrowing?: {
    hold_counts?: number;
  };
}

function estimateWait(holds: number, availableCopies: number): number | undefined {
  if (availableCopies > 0) return 0;
  if (holds === 0) return 0;
  // Rough estimate: 3 weeks per hold per copy, assuming ~3-week loan periods
  const copies = Math.max(1, availableCopies);
  return Math.round((holds / copies) * 21);
}

function mapStatus(available: number, total: number): AvailabilityStatus {
  if (total === 0) return AvailabilityStatus.UNAVAILABLE;
  if (available > 0) return AvailabilityStatus.AVAILABLE;
  return AvailabilityStatus.ON_HOLD;
}

export async function checkBplAvailability(isbn: string): Promise<LibraryAvailabilityResult[]> {
  const results: LibraryAvailabilityResult[] = [];

  try {
    // BiblioCommons public search API
    const searchParams = new URLSearchParams({
      query: isbn,
      searchType: "isbn",
      locale: "en-US",
    });
    const searchUrl = `${BPL_API}/bibs/search?${searchParams}`;

    const res = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Fall back to reporting a link for manual check
      return fallbackLink(isbn);
    }

    const data: BiblioSearchResponse = await res.json();
    const bibs = data.entities?.bibs;
    if (!bibs) return fallbackLink(isbn);

    for (const bib of Object.values(bibs)) {
      const { available_copies, total_copies, holds = 0 } = bib.availability;

      results.push({
        system: "BPL",
        format: "physical",
        status: mapStatus(available_copies, total_copies),
        holdCount: holds,
        estimatedWaitDays: estimateWait(holds, available_copies),
        sourceUrl: `${BPL_CATALOG}/v2/search?query=${isbn}&searchType=isbn`,
      });
    }
  } catch {
    return fallbackLink(isbn);
  }

  return results.length > 0 ? results : fallbackLink(isbn);
}

function fallbackLink(isbn: string): LibraryAvailabilityResult[] {
  return [
    {
      system: "BPL",
      format: "physical",
      status: AvailabilityStatus.UNKNOWN,
      sourceUrl: `${BPL_CATALOG}/v2/search?query=${isbn}&searchType=isbn`,
    },
  ];
}
