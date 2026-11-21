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

      // The HTML embeds serialized JSON with escaped quote characters.
      // Locate the exact BPSTPH station object, then read its own fields.
      const marker = STATION_ID + ',\\"type\\":\\"station\\"';
      const stationStart = html.indexOf(marker);

      if (!upstream.ok || stationStart < 0) {
        return new Response(JSON.stringify({
          error: "BPSTPH station entity not found",
          upstream_status: upstream.status,
          station_id: STATION_ID
        }), { status: 502, headers });
      }

      const stationContext = html.slice(stationStart, stationStart + 5000);
      const countKey = 'listener_count\\":';
      const countAt = stationContext.indexOf(countKey);
      if (countAt < 0) {
        return new Response(JSON.stringify({
          error: "BPSTPH station entity found, but listener_count is absent",
          station_id: STATION_ID,
          station_context: stationContext.slice(0, 1200)
        }), { status: 502, headers });
      }

      const digits = stationContext.slice(countAt + countKey.length).match(/^\\d+/);
      if (!digits) {
        return new Response(JSON.stringify({
          error: "BPSTPH listener_count value was not numeric",
          station_id: STATION_ID
        }), { status: 502, headers });
      }

      const broadcastKey = 'is_broadcasting\\":';
      const broadcastAt = stationContext.indexOf(broadcastKey);
      const broadcastValue = broadcastAt < 0 ? null :
        stationContext.slice(broadcastAt + broadcastKey.length).match(/^(true|false)/);
      return new Response(JSON.stringify({
        listeners: Number(digits[0]),
        is_broadcasting: broadcastValue ? broadcastValue[0] === "true" : null,
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
