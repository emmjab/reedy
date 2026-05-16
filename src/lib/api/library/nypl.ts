import type { LibraryAvailabilityResult } from "@/types";
import { AvailabilityStatus } from "@prisma/client";

// NYPL uses Sierra ILS. Their public catalog is at catalog.nypl.org.
// The catalog exposes availability data via their item search endpoint.
// We parse the HTML response since there's no fully-open JSON API.
const NYPL_CATALOG = "https://catalog.nypl.org";

function parseAvailabilityFromHtml(html: string): { available: number; total: number; holds: number } {
  let available = 0;
  let total = 0;
  let holds = 0;

  // Pattern: "X of Y copies available" or "X copies available"
  const availMatch = html.match(/(\d+)\s+of\s+(\d+)\s+cop(?:y|ies)\s+available/i);
  if (availMatch) {
    available = parseInt(availMatch[1]);
    total = parseInt(availMatch[2]);
  } else {
    const singleMatch = html.match(/(\d+)\s+cop(?:y|ies)\s+available/i);
    if (singleMatch) {
      available = parseInt(singleMatch[1]);
      total = available;
    }
  }

  // Pattern: "X holds on Y copies"
  const holdsMatch = html.match(/(\d+)\s+holds?\s+on/i);
  if (holdsMatch) holds = parseInt(holdsMatch[1]);

  return { available, total, holds };
}

function estimateWait(holds: number, available: number): number | undefined {
  if (available > 0) return 0;
  if (holds === 0) return 0;
  const copies = Math.max(1, available);
  return Math.round((holds / copies) * 21);
}

export async function checkNyplAvailability(isbn: string): Promise<LibraryAvailabilityResult[]> {
  const catalogUrl = `${NYPL_CATALOG}/search~S1/?searchtype=i&searcharg=${encodeURIComponent(isbn)}&SORT=D`;

  try {
    const res = await fetch(catalogUrl, {
      headers: {
        "User-Agent": "Reedy/1.0 (book-tracking app; library availability check)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return fallbackLink(isbn);

    const html = await res.text();

    // Check if there are results
    if (html.includes("No results found") || html.includes("Your search retrieved no results")) {
      return [
        {
          system: "NYPL",
          format: "physical",
          status: AvailabilityStatus.UNAVAILABLE,
          sourceUrl: catalogUrl,
        },
      ];
    }

    const { available, total, holds } = parseAvailabilityFromHtml(html);

    let status: AvailabilityStatus;
    if (total === 0) status = AvailabilityStatus.UNKNOWN;
    else if (available > 0) status = AvailabilityStatus.AVAILABLE;
    else if (holds > 0) status = AvailabilityStatus.ON_HOLD;
    else status = AvailabilityStatus.CHECKED_OUT;

    return [
      {
        system: "NYPL",
        format: "physical",
        status,
        holdCount: holds || undefined,
        estimatedWaitDays: estimateWait(holds, available),
        sourceUrl: catalogUrl,
      },
    ];
  } catch {
    return fallbackLink(isbn);
  }
}

function fallbackLink(isbn: string): LibraryAvailabilityResult[] {
  return [
    {
      system: "NYPL",
      format: "physical",
      status: AvailabilityStatus.UNKNOWN,
      sourceUrl: `${NYPL_CATALOG}/search~S1/?searchtype=i&searcharg=${encodeURIComponent(isbn)}&SORT=D`,
    },
  ];
}
