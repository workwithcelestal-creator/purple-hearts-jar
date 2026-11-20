# PURPLE HEARTS JAR 💜

A simple public jar visualization for BPSTPH on Stationhead.

## What it displays
- One heart per current Stationhead listener.
- Milestone markers: 7, 17, 37, 77, and 100.
- Above 100 listeners: "Hearts overflowing = Your streams are counted."
- No demographics, usernames, leaderboards, or other analytics.

## Deployment
Enable GitHub Pages in **Settings → Pages → Deploy from a branch → main → /(root)**.

The public URL will be:
https://workwithcelestal-creator.github.io/purple-hearts-jar/

## Live Stationhead connection status
The visual website is in place, but the listener counter is **not yet connected** to Stationhead.

Stationhead's public FAQ says hosts can see their current live listener count, but that does not establish a supported public endpoint that third-party websites can read. The page intentionally does not invent or simulate a count.

When a reliable, permitted public source is verified, set `LISTENER_COUNT_URL` near the bottom of `index.html` to a JSON endpoint returning:

```json
{ "listeners": 12 }
```

The page polls that endpoint every 10 seconds. If Stationhead requires a browser-side cross-origin request, a small proxy may be needed; no Google Sheets or database is required for this read-only counter.

## Privacy
The page is designed to consume only the current listener total. It does not request Stationhead credentials or collect listener identities.
