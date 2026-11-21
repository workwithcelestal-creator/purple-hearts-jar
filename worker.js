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

      // Match the serialized BPSTPH station entity, allowing for escaped quotes.
      const stationMarker = new RegExp(STATION_ID + ',.{0,30}?type.{0,12}?station');
      const stationMatch = stationMarker.exec(html);

      if (!upstream.ok || !stationMatch) {
        return new Response(JSON.stringify({
          error: "BPSTPH station entity not found",
          upstream_status: upstream.status,
          station_id: STATION_ID
        }), { status: 502, headers });
      }

      const stationContext = html.slice(stationMatch.index, stationMatch.index + 5000);
      // Skip escaped quote/backslash characters between the key and its numeric value.
      const countMatch = stationContext.match(/listener_count.{0,30}?(\\d+)/);
      if (!countMatch) {
        return new Response(JSON.stringify({
          error: "BPSTPH station entity found, but listener_count could not be parsed",
          station_id: STATION_ID,
          station_context: stationContext.slice(0, 1200)
        }), { status: 502, headers });
      }

      const broadcastMatch = stationContext.match(/is_broadcasting.{0,30}?(true|false)/);
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
