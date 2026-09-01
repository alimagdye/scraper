import type { RawBook } from "./schemas.js";

export function normalizePrice(priceText: string): number {
  const value = priceText.replace("£", "").trim();

  return Number(value);
}

export function normalizeBook(rawBook: RawBook) {
  return {
    ...rawBook,
    price_gbp: normalizePrice(rawBook.price_text),
  };
}
