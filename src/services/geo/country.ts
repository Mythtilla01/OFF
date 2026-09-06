export function normalizeCountryCode(value: string | null | undefined) {
  const code = value?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : "XX";
}
