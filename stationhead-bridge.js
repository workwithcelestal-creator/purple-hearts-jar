/*
 * PURPLE HEARTS JAR — Stationhead profile bridge
 *
 * Deploy this file as a Cloudflare Worker.
 * It fetches ONLY the BPSTPH public profile, server-side, so browser CORS
 * restrictions do not apply. It returns a count only when the profile HTML
 * contains a listener-count phrase. It never substitutes trending counts.
 */

const PROFILE_URL = "https://stationhead.com/bpstph";
const ALLOWED_ORIGIN = "*"; // Public read-only jar page

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(), "Content-Type": "application/json; charset=utf-8" }
  });
}

function extractCount(html) {
  // Look for the same explicit "N listener(s)" wording displayed on a profile.
  const patterns = [
    /(?:^|[^\\d])([\\d,]+)\\s+listeners?\\b/i,
    /"listenerCount"\\s*:\\s*(\\d+)/i,
    /"listenersCount"\\s*:\\s*(\\d+)/i
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return Number(match[1].replace(/,/g, ""));
  }
  return null;
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }
    const url = new URL(request.url);
    if (url.pathname !== "/" && url.pathname !== "/bpstph") {
      return json({ error: "Not found" }, 404);
    }
    try {
      const upstream = await fetch(PROFILE_URL, {
        method: "GET",
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0 (compatible; PurpleHeartsJar/1.0)"
        },
        redirect: "follow",
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      if (!upstream.ok) {
        return json({ error: "Stationhead profile returned HTTP " + upstream.status }, 502);
      }
      const html = await upstream.text();
      const listeners = extractCount(html);
      if (listeners === null || !Number.isFinite(listeners)) {
        return json({
          error: "BPSTPH profile response did not include a readable listener count.",
          source: "https://stationhead.com/bpstph"
        }, 503);
      }
      return json({
        listeners,
        source: "https://stationhead.com/bpstph",
        checked_at: new Date().toISOString()
      });
    } catch (error) {
      return json({ error: "Could not retrieve the BPSTPH public profile." }, 502);
    }
  }
};
