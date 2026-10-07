# Mortgage Market Dashboard

A one-page dashboard of mortgage rates, Treasury yields, stock market numbers and housing data, hosted on GitHub Pages.

- `index.html` is the whole page. It reads its numbers from `data/market.json`.
- `scripts/fetch_fred.py` pulls the numbers from the FRED API and writes `data/market.json`.
- `.github/workflows/update-data.yml` runs that script several times each weekday, saves the data file, and publishes the site. It also republishes whenever `main` changes. Run it by hand from the Actions tab with **Run workflow**.

The FRED API key lives only in the repository secret `FRED_API_KEY`. Quick links, tools, the color scheme and the alert level are saved only in each visitor's own browser.

Data: FRED, Federal Reserve Bank of St. Louis. Average 30- and 15-year rates from the Freddie Mac Primary Mortgage Market Survey; FHA and jumbo rates from the Optimal Blue Mortgage Market Indices; existing home sales and median price from the National Association of Realtors. MBS prices are not available for free, so the page links to Mortgage News Daily instead.

Fed meeting dates come from a list in `scripts/fetch_fred.py` (through 2027). Add the next year's dates there when the Fed posts them.
