const faNum = new Intl.NumberFormat("fa-IR");

/** Format an IRR amount (string or number) into a grouped Persian numeral string. */
export function formatIRR(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(value)) return "—";
  return faNum.format(Math.round(value));
}

/** Format a foreign denomination like "25 USD". */
export function formatDenomination(denomination: string, currency: string): string {
  const value = Number(denomination);
  const n = Number.isFinite(value) ? value : denomination;
  return `${n} ${currency}`;
}

const COUNTRY_LABELS: Record<string, string> = {
  US: "آمریکا",
  GB: "بریتانیا",
  DE: "آلمان",
  TR: "ترکیه",
  AE: "امارات",
  CA: "کانادا",
};

export function countryLabel(code: string): string {
  return COUNTRY_LABELS[code?.toUpperCase()] ?? code;
}

export const CATEGORY_LABELS: Record<string, string> = {
  gift_card: "گیفت‌کارت",
  subscription: "اشتراک",
  software: "نرم‌افزار",
  game: "بازی",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}
