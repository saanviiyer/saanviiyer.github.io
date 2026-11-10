#!/usr/bin/env python3
"""Fetch the Substack RSS feed and write _data/substack.json.

Run by .github/workflows/substack.yml on a schedule. The non-technical section of
pages/writing-index.html renders from the JSON this writes, so a new Substack post
shows up on the site automatically after the next scheduled run.

Standard library only (so it needs no install step in CI). Titles are trimmed at the
first colon to match the site's clean, short style; the full title is kept too.
"""
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

FEED_URL = "https://saanviss.substack.com/feed"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "_data", "substack.json")


def fetch(url):
    # Substack returns 403 to the default urllib agent and to short custom ones from
    # CI ranges, so send a normal browser agent and ask for the feed content types.
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
            ),
            "Accept": "application/rss+xml, application/xml, text/xml, */*",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def text(node):
    return (node.text or "").strip() if node is not None else ""


def short_title(full):
    # The site lists the clean main title; drop a trailing ": subtitle" if present.
    return re.split(r"\s*:\s", full, maxsplit=1)[0].strip()


def parse(xml_bytes):
    root = ET.fromstring(xml_bytes)
    channel = root.find("channel")
    items = []
    for it in channel.findall("item"):
        title_full = text(it.find("title"))
        link = text(it.find("link"))
        if not title_full or not link:
            continue
        pub = text(it.find("pubDate"))
        try:
            iso = parsedate_to_datetime(pub).strftime("%Y-%m-%d")
        except Exception:
            iso = ""
        items.append(
            {
                "title": short_title(title_full),
                "title_full": title_full,
                "url": link,
                "date": iso,
                "description": text(it.find("description")),
            }
        )
    # newest first
    items.sort(key=lambda p: p["date"], reverse=True)
    return items


def main():
    try:
        items = parse(fetch(FEED_URL))
    except Exception as e:  # never wipe the existing file on a transient failure
        sys.stderr.write(f"fetch/parse failed: {e}\n")
        return 1
    if not items:
        sys.stderr.write("no items parsed; leaving existing file untouched\n")
        return 1
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write("\n")
    sys.stderr.write(f"wrote {len(items)} posts to {OUT_PATH}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
