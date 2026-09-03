import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { normalizeBook } from "./normalizer.js";
import { scrapeBooks, getScraperStats } from "./scraper.js";
import { BookSchema, type Book } from "./schemas.js";

const OUTPUT_DIR = "output";

const BOOKS_FILE = path.join(OUTPUT_DIR, "books.json");
const RUN_REPORT_FILE = path.join(OUTPUT_DIR, "run-report.json");
const ERRORS_FILE = path.join(OUTPUT_DIR, "errors.json");

function ensureOutputDirectory(): void {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

async function main() {
  const startTime = new Date();
  const startTimestamp = startTime.toISOString();

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

  const stats = getScraperStats();

  const durationMs = Date.now() - startTime.getTime();

  const runReport = {
    start_time: startTimestamp,
    duration_ms: durationMs,
    pages_fetched: stats.pagesFetched,
    cache_hits: stats.cacheHits,
    valid_records: uniqueBooks.length,
    invalid_records: errors.length,
    failed_pages: stats.failedPages,
  };

  writeFileSync(RUN_REPORT_FILE, JSON.stringify(runReport, null, 2), "utf-8");

  writeFileSync(BOOKS_FILE, JSON.stringify(uniqueBooks, null, 2), "utf-8");

  writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2), "utf-8");

  console.log("");
  console.log(`valid_books=${uniqueBooks.length}`);
  console.log(`invalid_books=${errors.length}`);
  console.log(`failed_pages=${stats.failedPages}`);
  console.log(`pages_fetched=${stats.pagesFetched}`);
  console.log(`cache_hits=${stats.cacheHits}`);
  console.log(`duration_ms=${durationMs}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
