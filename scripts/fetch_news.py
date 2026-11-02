#!/usr/bin/env python3
"""
Fetch today's headlines from public RSS/Atom feeds and write js/news-data.js.

Runs inside GitHub Actions (see .github/workflows/deploy.yml) before the site is
deployed, so the page can show fresh news without any API key or server.
Only the standard library is used.
"""
import datetime as dt
import email.utils
import html
import json
import pathlib
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET

FEEDS = {
    "tech": [
        ("BBC", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
        ("New York Times", "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml"),
        ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
        ("The Verge", "https://www.theverge.com/rss/index.xml"),
        ("CNBC", "https://www.cnbc.com/id/19854910/device/rss/rss.html"),
    ],
    "ai": [
        ("MIT Technology Review", "https://www.technologyreview.com/feed/"),
        ("TechCrunch", "https://techcrunch.com/category/artificial-intelligence/feed/"),
        ("The Verge", "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"),
    ],
    "business": [
        ("BBC", "https://feeds.bbci.co.uk/news/business/rss.xml"),
        ("New York Times", "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml"),
        ("CNBC", "https://www.cnbc.com/id/10001147/device/rss/rss.html"),
    ],
    "finance": [
        ("CNBC", "https://www.cnbc.com/id/10000664/device/rss/rss.html"),
        ("CNBC", "https://www.cnbc.com/id/15839069/device/rss/rss.html"),
        ("New York Times", "https://rss.nytimes.com/services/xml/rss/nyt/YourMoney.xml"),
    ],
}
AI_WORDS = re.compile(
    r"\b(AI|A\.I\.|artificial intelligence|OpenAI|Anthropic|ChatGPT|Claude|Gemini|LLMs?|"
    r"machine learning|chatbots?|neural|deep learning)\b",
    re.IGNORECASE,
)
PER_CATEGORY = 15
MAX_AGE_DAYS = 3
ATOM = "{http://www.w3.org/2005/Atom}"
OUT = pathlib.Path(__file__).resolve().parent.parent / "js" / "news-data.js"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (personal planner news fetcher)"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def text_of(el):
    return (el.text or "").strip() if el is not None else ""


def clean(raw, limit=180):
    s = html.unescape(raw or "")
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= limit else s[: limit - 1].rstrip() + "…"


def parse_date(raw):
    if not raw:
        return None
    try:
        d = email.utils.parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        try:
            d = dt.datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if d.tzinfo is None:
        d = d.replace(tzinfo=dt.timezone.utc)
    return d.astimezone(dt.timezone.utc)


def parse_feed(data, source):
    root = ET.fromstring(data)
    items = []
    for it in root.iter("item"):
        items.append({
            "title": clean(text_of(it.find("title")), 200),
            "link": text_of(it.find("link")),
            "date": parse_date(text_of(it.find("pubDate"))),
            "summary": clean(text_of(it.find("description"))),
            "source": source,
        })
    for it in root.iter(ATOM + "entry"):
        link = ""
        for ln in it.findall(ATOM + "link"):
            if ln.get("rel", "alternate") == "alternate" and ln.get("href"):
                link = ln.get("href")
                break
        summary = text_of(it.find(ATOM + "summary"))
        if not summary:
            summary = text_of(it.find(ATOM + "content"))
        items.append({
            "title": clean(text_of(it.find(ATOM + "title")), 200),
            "link": link,
            "date": parse_date(text_of(it.find(ATOM + "published")) or text_of(it.find(ATOM + "updated"))),
            "summary": clean(summary),
            "source": source,
        })
    return [x for x in items if x["title"] and x["link"].startswith("http")]


def pick(items, now):
    cutoff = now - dt.timedelta(days=MAX_AGE_DAYS)
    seen, out = set(), []
    epoch = dt.datetime(1970, 1, 1, tzinfo=dt.timezone.utc)
    for x in sorted(items, key=lambda x: x["date"] or epoch, reverse=True):
        key = re.sub(r"\W+", "", x["title"].lower())
        if key in seen or (x["date"] and x["date"] < cutoff):
            continue
        seen.add(key)
        out.append(x)
        if len(out) >= PER_CATEGORY:
            break
    return out


def main():
    now = dt.datetime.now(dt.timezone.utc)
    raw = {cat: [] for cat in FEEDS}
    sources, ok = set(), 0
    for cat, feeds in FEEDS.items():
        for source, url in feeds:
            try:
                items = parse_feed(fetch(url), source)
            except Exception as exc:  # one broken feed should not stop the rest
                print(f"skip {source} {url}: {exc}", file=sys.stderr)
                continue
            ok += 1
            sources.add(source)
            raw[cat].extend(items)
            if cat == "tech":
                raw["ai"].extend(x for x in items if AI_WORDS.search(x["title"] + " " + x["summary"]))
    if ok == 0:
        print("No feed could be fetched; keeping the existing news file.", file=sys.stderr)
        return 0
    data = {
        "updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "sources": sorted(sources),
        "categories": {
            cat: [
                {**{k: v for k, v in x.items() if k != "date"},
                 "published": x["date"].strftime("%Y-%m-%dT%H:%M:%SZ") if x["date"] else None}
                for x in pick(items, now)
            ]
            for cat, items in raw.items()
        },
    }
    OUT.write_text(
        "/* Generated by scripts/fetch_news.py. Do not edit by hand. */\n"
        "window.NEWS_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT} from {ok} feeds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
