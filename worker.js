
const PROFILE = "https://stationhead.com/bpstph";

export default {
  async fetch(request) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      const response = await fetch(PROFILE, {
        headers: {
          "Accept": "text/html",
          "User-Agent": "Mozilla/5.0"
        }
      });

      if (!response.ok) {
        return new Response(JSON.stringify({
          error: "Stationhead HTTP " + response.status
        }), { status: 502, headers });
      }

      const html = await response.text();
      const match = html.match(/(\d[\d,]*)\s+listeners?\b/i);

      if (!match) {
        return new Response(JSON.stringify({
          error: "BPSTPH listener count not found in profile response"
        }), { status: 503, headers });
      }

      return new Response(JSON.stringify({
        listeners: Number(match[1].replace(/,/g, "")),
        source: PROFILE,
        checked_at: new Date().toISOString()
      }), { headers });

    } catch (error) {
      return new Response(JSON.stringify({
        error: "Could not retrieve BPSTPH profile"
      }), { status: 502, headers });
    }
  }
};
