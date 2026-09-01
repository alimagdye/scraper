import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

const START_URL = "https://books.toscrape.com/";
const CACHE_DIR = "cache";

const USER_AGENT =
  "FlyRankInternship-A9/1.0 (+https://github.com/alimagdye/scraper)";

const TIMEOUT_MS = 5000;
const REQUEST_DELAY_MS = 500;

interface DiscoveredBook {
  productUrl: string;
  sourcePage: string;
}

interface RawBook {
  title: string;
  product_url: string;
  price_text: string;
  availability_text: string;
  rating_text: string;
  description: string | null;
  source_page: string;
  fetched_at: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCatalogueCacheFile(pageNumber: number): string {
  return path.join(CACHE_DIR, `catalogue-page-${pageNumber}.html`);
}

function getDetailCacheFile(url: string): string {
  // create a safe, deterministic filename from the URL
  const slug = url
    .replace("https://books.toscrape.com/catalogue/", "")
    .replace("/index.html", "")
    .replace(/[^a-z0-9-_]/gi, "_");

  return path.join(CACHE_DIR, `book-${slug}.html`);
}

async function fetchPage(
  url: string,
  cacheFile: string,
): Promise<{ html: string; fetchedAt: string }> {
  // cache hit
  if (existsSync(cacheFile)) {
    const html = readFileSync(cacheFile, "utf-8");

    console.log(`CACHE HIT (${html.length} bytes)`);

    return {
      html,
      fetchedAt: new Date().toISOString(),
    };
  }

  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }

  // delay only before a real request
  await sleep(REQUEST_DELAY_MS);

  console.log(`FETCH ${url}`);

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

    // only parse a successful response
    if (response.status !== 200) {
      throw new Error(
        `Fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();

    writeFileSync(cacheFile, html, "utf-8");

    console.log(`FETCHED (${html.length} bytes)`);

    return {
      html,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function discoverBooks(html: string, pageUrl: string): DiscoveredBook[] {
  const $ = cheerio.load(html);

  const books: DiscoveredBook[] = [];

  $("article.product_pod h3 a").each((_index, element) => {
    const href = $(element).attr("href");

    if (href) {
      books.push({
        productUrl: new URL(href, pageUrl).href,
        sourcePage: pageUrl,
      });
    }
  });

  return books;
}

function extractNextPageUrl(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);

  const href = $("li.next a").attr("href");

  if (!href) {
    return null;
  }

  return new URL(href, pageUrl).href;
}

function extractRawBook(
  html: string,
  book: DiscoveredBook,
  fetchedAt: string,
): RawBook {
  const $ = cheerio.load(html);

  // target the product area specifically
  const productMain = $(".product_main");

  const title = productMain.find("h1").first().text().trim();

  const priceText = productMain.find(".price_color").first().text().trim();

  const availabilityText = productMain
    .find(".availability")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  // rating is stored as a class, for example:
  // <p class="star-rating Three">
  const ratingClasses =
    productMain.find(".star-rating").first().attr("class") ?? "";

  const ratingText =
    ratingClasses
      .split(/\s+/)
      .find((className) => className !== "star-rating") ?? "";

  // description can be missing
  const descriptionElement = $("#product_description").next("p");

  const description = descriptionElement.length
    ? descriptionElement.text().trim()
    : null;

  return {
    title,
    product_url: book.productUrl,
    price_text: priceText,
    availability_text: availabilityText,
    rating_text: ratingText,
    description,
    source_page: book.sourcePage,
    fetched_at: fetchedAt,
  };
}

async function main() {
  let currentUrl = START_URL;
  let cataloguePages = 0;

  const discoveredBooks: DiscoveredBook[] = [];

  // discover books from exactly 3 catalogue pages
  while (currentUrl && cataloguePages < 3) {
    const pageNumber = cataloguePages + 1;

    const cacheFile = getCatalogueCacheFile(pageNumber);

    const { html } = await fetchPage(currentUrl, cacheFile);

    const books = discoverBooks(html, currentUrl);

    discoveredBooks.push(...books);

    cataloguePages++;

    currentUrl = extractNextPageUrl(html, currentUrl) ?? "";
  }

  // remove duplicate product URLs
  const uniqueBooks = [
    ...new Map(discoveredBooks.map((book) => [book.productUrl, book])).values(),
  ];

  const rawBooks: RawBook[] = [];

  // fetch and extract all book detail pages
  for (const book of uniqueBooks) {
    const cacheFile = getDetailCacheFile(book.productUrl);

    const { html, fetchedAt } = await fetchPage(book.productUrl, cacheFile);

    const rawBook = extractRawBook(html, book, fetchedAt);

    rawBooks.push(rawBook);
  }

  console.log("");
  console.log("Sample raw record:");
  console.log(JSON.stringify(rawBooks[0], null, 2));

  console.log("");
  console.log(`detail_pages=${rawBooks.length}`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
