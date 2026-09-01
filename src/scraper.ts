import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";

import type { RawBook } from "./schemas.js";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCatalogueCacheFile(pageNumber: number): string {
  return path.join(CACHE_DIR, `catalogue-page-${pageNumber}.html`);
}

function getDetailCacheFile(url: string): string {
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

  // Wait only before real requests
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

  // Target only the product area
  const productMain = $(".product_main");

  const title = productMain.find("h1").first().text().trim();

  const priceText = productMain.find(".price_color").first().text().trim();

  const availabilityText = productMain
    .find(".availability")
    .text()
    .replace(/\s+/g, " ")
    .trim();

  // Example: <p class="star-rating Three">
  const ratingClasses =
    productMain.find(".star-rating").first().attr("class") ?? "";

  const ratingText =
    ratingClasses
      .split(/\s+/)
      .find((className) => className !== "star-rating") ?? "";

  // Some books have no description
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

export async function scrapeBooks(): Promise<RawBook[]> {
  let currentUrl = START_URL;
  let cataloguePages = 0;

  const discoveredBooks: DiscoveredBook[] = [];

  // Discover exactly 3 catalogue pages
  while (currentUrl && cataloguePages < 3) {
    const pageNumber = cataloguePages + 1;

    const cacheFile = getCatalogueCacheFile(pageNumber);

    const { html } = await fetchPage(currentUrl, cacheFile);

    const books = discoverBooks(html, currentUrl);

    discoveredBooks.push(...books);

    cataloguePages++;

    currentUrl = extractNextPageUrl(html, currentUrl) ?? "";
  }

  // Use product URL as identity and remove duplicates
  const uniqueBooks = [
    ...new Map(discoveredBooks.map((book) => [book.productUrl, book])).values(),
  ];

  const rawBooks: RawBook[] = [];

  // Fetch and extract all detail pages
  for (const book of uniqueBooks) {
    const cacheFile = getDetailCacheFile(book.productUrl);

    const { html, fetchedAt } = await fetchPage(book.productUrl, cacheFile);

    const rawBook = extractRawBook(html, book, fetchedAt);

    rawBooks.push(rawBook);
  }

  return rawBooks;
}
