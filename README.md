# scraper

Polite scraping pipeline: it downloads the first three catalogue pages of Books to Scrape, visits all 60 book pages, turns messy HTML into clean, checked JSON records, survives a broken page without crashing, and ends every run with a short report of what happened.

## Target Classification

### Target

This scraper collects data from **Books to Scrape**:

https://books.toscrape.com/

Books to Scrape is a sandbox website created specifically for people to practise web scraping.

### Scope

The scraper will collect data from **only the first 3 catalogue pages**, for a total of **60 books**.

### Data Collected

For each book, the scraper will collect the required book information, including:

- Title
- Price
- Availability
- Rating
- Product URL

The data is collected only for this educational scraping assignment.

### robots.txt

The following URL was requested once:

https://books.toscrape.com/robots.txt

The request returned **404 Not Found**, so **no robots file found**.

A missing `robots.txt` file is not considered permission to scrape. The target is used because Books to Scrape is specifically designed as a sandbox for practising web scraping.

### Why This Target Is Appropriate

This target is appropriate because Books to Scrape is intentionally designed as a practice environment for learning web scraping, and this project collects a small, limited amount of publicly available practice data.

**I will not reuse this code on another site without checking its rules and terms first.**

### Main libraries

- Node.js
- TypeScript
- Cheerio
- Zod

## Installation

Clone the repository:

```bash
git clone https://github.com/alimagdye/scraper
cd scraper
```

Install dependencies:

```bash
npm install
```

## Run

Run the scraper with:

```bash
npm run dev
```

The scraper will generate:

```text
output/
├── books.json
├── errors.json
└── run-report.json
```

The scraper can be run repeatedly without creating duplicate records.

## Record Schema

Each valid book record follows this structure:

```json
{
  "title": "A Light in the Attic",
  "product_url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html",
  "price_text": "£51.77",
  "price_gbp": 51.77,
  "availability_text": "In stock (22 available)",
  "rating_text": "Three",
  "description": "Book description...",
  "source_page": "https://books.toscrape.com/",
  "fetched_at": "2026-09-03T00:00:00.000Z"
}
```

### Fields

| Field               | Type   | Description                                   |
| ------------------- | ------ | --------------------------------------------- | ------------------------------ |
| `title`             | string | Book title                                    |
| `product_url`       | string | Canonical HTTPS URL of the book               |
| `price_text`        | string | Original price text from the website          |
| `price_gbp`         | number | Normalized book price in GBP                  |
| `availability_text` | string | Original availability information             |
| `rating_text`       | string | Book rating as text                           |
| `description`       | string | null                                          | Book description, if available |
| `source_page`       | string | Catalogue page where the book was discovered  |
| `fetched_at`        | string | ISO timestamp for when the page was processed |

All records are validated using **Zod** before being written to `books.json`.

Invalid records are written to:

```text
output/errors.json
```

and are never included in the valid output.

## Politeness Rules

This scraper follows several rules to avoid unnecessary load on the target server:

- **User-Agent:** Every real request identifies the scraper.
- **Delay:** The scraper waits at least 500ms before making a real request.
- **Timeout:** Requests are aborted after 5 seconds.
- **Cache:** Downloaded HTML pages are saved locally and reused during development.
- **Status checks:** Only HTTP `200` responses are treated as successful HTML.
- **Retry policy:** Timeouts and server errors (`5xx`) are retried once.
- **No retry for `403` or `404`:** Retrying these responses would be unnecessary or impolite.

Cached pages never make another request to the target server.

## Validation and Idempotency

The scraper uses the absolute `product_url` as the canonical identity for each book.

Duplicate URLs are removed before output.

Running the scraper multiple times produces the same set of 60 books instead of appending duplicates.

This makes the scraper **idempotent**, which means it is safe to rerun after a failed or interrupted job.

## Failure Handling

Each book page is handled independently.

If one page fails, the scraper logs the failure and continues processing the remaining pages.

A failed page does not stop the entire scraping job.

The final run report records:

- Start time
- Duration
- Pages fetched
- Cache hits
- Valid records
- Invalid records
- Failed pages

## Example Run Report

A real run produced:

```json
{
  "start_time": "2026-09-03T10:02:32.793Z",
  "duration_ms": 1606,
  "pages_fetched": 0,
  "cache_hits": 63,
  "valid_records": 60,
  "invalid_records": 0,
  "failed_pages": 1
}
```

The report provides visibility into every scraper run and helps prevent failures from going unnoticed.

## Ethics

When collecting data, I would use an official API when one is available. I would never bypass logins, paywalls, access restrictions, or blocks. I would also collect only the data needed for the specific task rather than gathering unnecessary information.

## Limitation

This scraper is intentionally limited to the first three catalogue pages and is designed specifically for the Books to Scrape practice website. It should not be reused on another website without first checking that site's rules, terms, and appropriate access methods.

---
