import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const URL = "https://books.toscrape.com/";
const CACHE_DIR = "cache";
const CACHE_FILE = path.join(CACHE_DIR, "catalogue-page-1.html");

const USER_AGENT =
  "FlyRankInternship-A9/1.0 (+https://github.com/alimagdye/scraper)";

const TIMEOUT_MS = 5000;

async function fetchCataloguePage(): Promise<string> {
  // check cache first
  if (existsSync(CACHE_FILE)) {
    const html = readFileSync(CACHE_FILE, "utf-8");

    console.log(`CACHE HIT (${html.length} bytes)`);

    return html;
  }

  console.log("FETCH");

  // create cache directory if it doesn't exist
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  // abort controller lets us enforce a timeout
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(URL, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    // Check status BEFORE reading/parsing the HTML
    if (response.status !== 200) {
      throw new Error(
        `Fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();

    // Save the successful response
    writeFileSync(CACHE_FILE, html, "utf-8");

    console.log(`FETCH (${html.length} bytes)`);

    return html;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  try {
    await fetchCataloguePage();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
