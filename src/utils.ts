export interface ParsedPersonnummer {
  raw: string;
  birthDate: string;
  year: number;
  month: number;
  day: number;
  birthNumber: number;
  gender: "male" | "female";
  tenDigit: string;
}

export function parsePersonnummer(pnr: string): ParsedPersonnummer {
  const year = parseInt(pnr.slice(0, 4), 10);
  const month = parseInt(pnr.slice(4, 6), 10);
  const day = parseInt(pnr.slice(6, 8), 10);
  const birthNumber = parseInt(pnr.slice(8, 11), 10);
  const gender = birthNumber % 2 === 0 ? "female" : "male";
  const yy = pnr.slice(2, 4);
  const mm = pnr.slice(4, 6);
  const dd = pnr.slice(6, 8);
  const last4 = pnr.slice(8, 12);
  const tenDigit = `${yy}${mm}${dd}-${last4}`;
  const birthDate = `${year}-${mm}-${dd}`;

  return { raw: pnr, birthDate, year, month, day, birthNumber, gender, tenDigit };
}

export function normalizeToTwelveDigit(input: string): string {
  const cleaned = input.replace(/[-+\s]/g, "");
  if (cleaned.length === 12) return cleaned;
  if (cleaned.length === 10) {
    const yy = parseInt(cleaned.slice(0, 2), 10);
    const currentYear = new Date().getFullYear() % 100;
    const century = yy <= currentYear ? "20" : "19";
    return century + cleaned;
  }
  throw new Error(`Cannot normalize "${input}" to 12 digits`);
}
