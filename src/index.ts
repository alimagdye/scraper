import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { normalizeBook } from "./normalizer.js";
import { scrapeBooks } from "./scraper.js";
import { BookSchema, type Book } from "./schemas.js";

const OUTPUT_DIR = "output";

const BOOKS_FILE = path.join(OUTPUT_DIR, "books.json");
const ERRORS_FILE = path.join(OUTPUT_DIR, "errors.json");

function ensureOutputDirectory(): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function main() {
  const rawBooks = await scrapeBooks();

  const validBooks: Book[] = [];
  const errors: unknown[] = [];

  for (const rawBook of rawBooks) {
    const normalizedBook = normalizeBook(rawBook);

    const result = BookSchema.safeParse(normalizedBook);

    if (result.success) {
      validBooks.push(result.data);
    } else {
      errors.push({
        product_url: rawBook.product_url,
        reason: result.error.issues,
        record: normalizedBook,
      });
    }
  }

  // product_url is the canonical identity
  const uniqueBooks = [
    ...new Map(validBooks.map((book) => [book.product_url, book])).values(),
  ];

  ensureOutputDirectory();

  writeFileSync(BOOKS_FILE, JSON.stringify(uniqueBooks, null, 2), "utf-8");

  writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2), "utf-8");

  console.log("");
  console.log(`valid_books=${uniqueBooks.length}`);
  console.log(`invalid_books=${errors.length}`);
  console.log(`books_file=${BOOKS_FILE}`);
  console.log(`errors_file=${ERRORS_FILE}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
