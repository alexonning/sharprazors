/** Display a Brazilian phone as it is typed, including pasted +55 numbers. */
export function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  const number = digits.slice(2), split = number.length > 8 ? 5 : 4;
  return `(${digits.slice(0, 2)}) ${number.slice(0, split)}${number.length > split ? "-" + number.slice(split) : ""}`;
}

/** Brazilian phones use a single country-code-prefixed key. */
export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 24 || !/^[+\d\s().-]+$/.test(value)) return null;
  let digits = value.replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) digits = digits.slice(2);
  if (!/^[1-9]\d(?:[2-5]\d{7}|9\d{8})$/.test(digits)) return null;
  const validDDDs = new Set("11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99".split(" "));
  if (!validDDDs.has(digits.slice(0, 2)) || /^(\d)\1+$/.test(digits.slice(2))) return null;
  return `55${digits}`;
}
