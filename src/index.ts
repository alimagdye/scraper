import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const START_URL = "https://books.toscrape.com/";
const CACHE_DIR = "cache";

const USER_AGENT =
  "FlyRankInternship-A9/1.0 (+https://github.com/alimagdye/scraper)";

const TIMEOUT_MS = 5000;
const REQUEST_DELAY_MS = 500;

function getCacheFile(pageNumber: number): string {
  return path.join(CACHE_DIR, `catalogue-page-${pageNumber}.html`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string, pageNumber: number): Promise<string> {
  const cacheFile = getCacheFile(pageNumber);

  // Read from cache first
  if (existsSync(cacheFile)) {
    const html = readFileSync(cacheFile, "utf-8");

    console.log(`CACHE HIT page=${pageNumber} (${html.length} bytes)`);

    return html;
  }

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  // polite delay before a real request
  await sleep(REQUEST_DELAY_MS);

  console.log(`FETCH page=${pageNumber}`);

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    // only 200 means success
    if (response.status !== 200) {
      throw new Error(
        `Fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();

    writeFileSync(cacheFile, html, "utf-8");

    console.log(`FETCHED page=${pageNumber} (${html.length} bytes)`);

    return html;
  } finally {
    clearTimeout(timeout);
  }
}

function extractBookUrls(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);

  const urls: string[] = [];

  $("article.product_pod h3 a").each((_index, element) => {
    const href = $(element).attr("href");

    if (href) {
      // convert relative URL to absolute URL
      const absoluteUrl = new URL(href, pageUrl).href;

      urls.push(absoluteUrl);
    }
  });

  return urls;
}

function extractNextPageUrl(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);

  const href = $("li.next a").attr("href");

  if (!href) {
    return null;
  }

  return new URL(href, pageUrl).href;
}

async function main() {
  let currentUrl = START_URL;

  const discoveredUrls: string[] = [];

  let cataloguePages = 0;

  while (currentUrl && cataloguePages < 3) {
    const pageNumber = cataloguePages + 1;

    const html = await fetchPage(currentUrl, pageNumber);

    const bookUrls = extractBookUrls(html, currentUrl);

    discoveredUrls.push(...bookUrls);

    cataloguePages++;

    const nextUrl = extractNextPageUrl(html, currentUrl);

    currentUrl = nextUrl ?? "";
  }

  const uniqueUrls = [...new Set(discoveredUrls)];

  console.log("");
  console.log(`catalogue_pages=${cataloguePages}`);
  console.log(`discovered=${discoveredUrls.length}`);
  console.log(`unique_urls=${uniqueUrls.length}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
