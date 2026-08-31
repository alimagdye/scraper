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
