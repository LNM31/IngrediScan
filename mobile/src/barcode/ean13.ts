/**
 * True only for exactly 13 ASCII digits whose last digit is the correct
 * EAN-13 check digit. No trimming or cleanup: that belongs to the UI.
 *
 * Check digit (GS1): weights 1,3,1,3,... over the first 12 digits,
 * check = (10 - sum % 10) % 10.
 */
export function isValidEan13(code: string): boolean {
  if (!/^[0-9]{13}$/.test(code)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = code.charCodeAt(i) - 48;
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const check = (10 - (sum % 10)) % 10;

  return check === code.charCodeAt(12) - 48;
}
