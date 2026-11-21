const PROFILE = "https://stationhead.com/bpstph";
const STATION_ID = "2797124";

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

      // Find the actual serialized station entity, not the earlier route parameter
      // that happens to contain the same numeric station ID.
      const marker = STATION_ID + ',\\\\?"type\\\\?":\\\\?"station\\\\?"';
      const markerRegex = new RegExp(STATION_ID + ',\\\\?"type\\\\?":\\\\?"station\\\\?"');
      const markerMatch = markerRegex.exec(html);

      if (!upstream.ok || !markerMatch) {
        return new Response(JSON.stringify({
          error: "BPSTPH station entity not found",
          upstream_status: upstream.status,
          station_id: STATION_ID
        }), { status: 502, headers });
      }

      const stationStart = markerMatch.index;
      const stationContext = html.slice(stationStart, stationStart + 5000);
      const countMatch = stationContext.match(/listener_count\\\\?":(\\d+)/);
      const broadcastMatch = stationContext.match(/is_broadcasting\\\\?":(true|false)/);

      if (!countMatch) {
        return new Response(JSON.stringify({
          error: "BPSTPH station entity found, but listener_count is absent",
          station_id: STATION_ID,
          station_context: stationContext.slice(0, 1200)
        }), { status: 502, headers });
      }

      return new Response(JSON.stringify({
        listeners: Number(countMatch[1]),
        is_broadcasting: broadcastMatch ? broadcastMatch[1] === "true" : null,
        station_id: STATION_ID,
        source: PROFILE,
        checked_at: new Date().toISOString()
      }), { headers });
    } catch (error) {
      return new Response(JSON.stringify({
        error: "Could not retrieve BPSTPH public profile",
        detail: String(error)
      }), { status: 502, headers });
    }
  }
};
