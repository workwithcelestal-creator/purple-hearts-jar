const PROFILE = "https://stationhead.com/bpstph";

export default {
  async fetch(request) {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers });

    try {
      const upstream = await fetch(PROFILE, {
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0"
        },
        redirect: "follow"
      });
      const html = await upstream.text();

      // First look for an explicit count in the returned BPSTPH profile HTML.
      const countMatch = html.match(/(?:^|[^\\d])([\\d,]+)\\s+listeners?\\b/i);
      if (upstream.ok && countMatch) {
        return new Response(JSON.stringify({
          listeners: Number(countMatch[1].replace(/,/g, "")),
          source: PROFILE,
          checked_at: new Date().toISOString()
        }), { headers });
      }

      // Diagnostic only: report what the public profile HTML actually contains.
      const snippets = {};
      for (const term of ["listener", "online", "bpstph", "profile", "__NEXT_DATA__", "__NUXT__"]) {
        const at = html.toLowerCase().indexOf(term.toLowerCase());
        snippets[term] = at < 0 ? null : html.slice(Math.max(0, at - 180), Math.min(html.length, at + 320));
      }
      const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
        .map(match => match[1]).slice(0, 25);
      const title = (html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i) || [])[1] || null;

      return new Response(JSON.stringify({
        error: "No explicit listener count found in BPSTPH profile HTML",
        upstream_status: upstream.status,
        final_url: upstream.url,
        html_length: html.length,
        title,
        snippets,
        scripts
      }), { status: 200, headers });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Could not fetch BPSTPH public profile",
        detail: String(error)
      }), { status: 502, headers });
    }
  }
};
