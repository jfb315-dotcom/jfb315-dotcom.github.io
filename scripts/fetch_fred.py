"""Pull dashboard data from FRED and write it to data/market.json.

Run by .github/workflows/update-data.yml. Needs the FRED_API_KEY environment
variable; the key is only ever sent to the FRED API, never written to disk or
printed. Uses only the Python standard library.

Each run merges what FRED returns into the existing data file, so a failed
series keeps its last good values and series where FRED only offers recent
history keep building up over time.
"""

import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("FRED_API_BASE", "https://api.stlouisfed.org/fred")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "market.json")

# series id -> years of history to keep (None = everything FRED has)
SERIES = {
    # Rates (charted, 1M to 10Y ranges)
    "DGS10": 11,            # 10-year Treasury yield, daily
    "MORTGAGE30US": 11,     # Freddie Mac 30-year fixed, weekly
    "MORTGAGE15US": 11,     # Freddie Mac 15-year fixed, weekly
    "OBMMIFHA30YF": 11,     # Optimal Blue 30-year FHA, daily (starts 2017)
    "OBMMIJUMBO30YF": 11,   # Optimal Blue 30-year jumbo, daily (starts 2017)
    # Fed
    "DFEDTARL": 11,         # target range, lower limit
    "DFEDTARU": 11,         # target range, upper limit
    "DFF": 0.25,            # effective fed funds rate
    # Market snapshot
    "SP500": 0.25,
    "DJIA": 0.25,
    "NASDAQCOM": 0.25,
    "VIXCLS": 0.25,
    "DCOILWTICO": 0.25,     # WTI crude oil
    "DTWEXBGS": 0.25,       # broad US dollar index
    # Housing, monthly
    "EXHOSLUSM495S": 3,     # existing home sales (NAR)
    "HOSMEDUSM052N": 3,     # median existing home price (NAR)
    "HOUST": 3,             # housing starts
}

# Upcoming events: a series from each release, used to look up its dates.
EVENTS = {
    "claims": "ICSA",
    "pmms": "MORTGAGE30US",
    "cpi": "CPIAUCSL",
    "retail": "RSAFS",
    "starts": "HOUST",
    "existing": "EXHOSLUSM495S",
    "jobs": "PAYEMS",
}

# Fed meeting decision days (second day of each meeting), from
# federalreserve.gov/monetarypolicy/fomccalendars.htm. Add new years here.
FOMC = [
    "2026-01-28", "2026-03-18", "2026-04-29", "2026-06-17",
    "2026-07-29", "2026-09-16", "2026-10-28", "2026-12-09",
    "2027-01-27", "2027-03-17", "2027-04-28", "2027-06-09",
    "2027-07-28", "2027-09-15", "2027-10-27", "2027-12-08",
]


class FredError(Exception):
    pass


def fred(path, key, **params):
    params.update(api_key=key, file_type="json")
    url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        # FRED explains bad requests in the body; the URL (with the key) is never printed.
        try:
            msg = json.load(e).get("error_message", "")
        except Exception:
            msg = ""
        raise FredError(f"HTTP {e.code} {msg}".strip()) from None
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        raise FredError(type(e).__name__) from None


def observations(sid, years, key, today):
    params = {"series_id": sid}
    if years:
        params["observation_start"] = (today - dt.timedelta(days=round(years * 365.25))).isoformat()
    obs = fred("series/observations", key, **params)["observations"]
    return {o["date"]: float(o["value"]) for o in obs if o["value"] not in (".", "")}


def upcoming(sid, key, today):
    rel = fred("series/release", key, series_id=sid)["releases"][0]["id"]
    res = fred("release/dates", key, release_id=rel, include_release_dates_with_no_data="true",
               sort_order="desc", limit=1000)
    return sorted({d["date"] for d in res["release_dates"] if d["date"] >= today.isoformat()})


def main():
    key = os.environ.get("FRED_API_KEY", "").strip()
    if not key:
        sys.exit("FRED_API_KEY is not set.")
    today = dt.datetime.now(dt.timezone.utc).date()

    try:
        with open(OUT) as f:
            old = json.load(f)
    except (OSError, ValueError):
        old = {}
    old_series = old.get("series", {})

    series, errors, ok = {}, [], 0
    for sid, years in SERIES.items():
        prev = dict(zip(old_series.get(sid, {}).get("d", []), old_series.get(sid, {}).get("v", [])))
        try:
            new = observations(sid, years, key, today)
            ok += 1
        except FredError as e:
            print(f"{sid}: {e}")
            errors.append(sid)
            new = {}
        merged = {**prev, **new}
        if years:
            start = (today - dt.timedelta(days=round(years * 365.25))).isoformat()
            merged = {d: v for d, v in merged.items() if d >= start}
        dates = sorted(merged)
        series[sid] = {"d": dates, "v": [merged[d] for d in dates]}
        print(f"{sid}: {len(dates)} values, latest {dates[-1] if dates else 'none'}")

    if ok == 0:
        sys.exit("Every FRED request failed; keeping the existing data file.")

    events = []
    old_events = [e for e in old.get("events", []) if e["date"] >= today.isoformat()]
    for name, sid in EVENTS.items():
        try:
            dates = upcoming(sid, key, today)
        except (FredError, KeyError, IndexError) as e:
            print(f"{name} dates: {e}")
            errors.append(f"{name} dates")
            dates = [e["date"] for e in old_events if e["type"] == name]
        events += [{"date": d, "type": name} for d in dates[:6]]
    events += [{"date": d, "type": "fed"} for d in FOMC if d >= today.isoformat()][:3]
    events.sort(key=lambda e: (e["date"], e["type"]))

    data = {
        "generated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "series": series,
        "events": events,
        "errors": errors,
    }
    # Leave the file untouched when nothing but the timestamp would change,
    # so the workflow does not commit a new version on every run.
    if {k: v for k, v in old.items() if k != "generated"} == {k: v for k, v in data.items() if k != "generated"}:
        print("No new data.")
        return
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"Wrote {OUT}" + (f" ({len(errors)} problems: {', '.join(errors)})" if errors else ""))


if __name__ == "__main__":
    main()
