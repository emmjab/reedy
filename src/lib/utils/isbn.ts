export function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[-\s]/g, "");
}

export function isIsbn13(isbn: string): boolean {
  return /^\d{13}$/.test(normalizeIsbn(isbn));
}

export function isIsbn10(isbn: string): boolean {
  return /^\d{9}[\dX]$/.test(normalizeIsbn(isbn));
}

export function isbn10toIsbn13(isbn10: string): string {
  const digits = normalizeIsbn(isbn10).slice(0, 9);
  const withPrefix = "978" + digits;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(withPrefix[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return withPrefix + check;
}

export function bestIsbn(isbn10?: string | null, isbn13?: string | null): string | null {
  if (isbn13) return normalizeIsbn(isbn13);
  if (isbn10) return isbn10toIsbn13(isbn10);
  return null;
}
