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

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    try {
      const upstream = await fetch(PROFILE, {
        headers: {
          "Accept": "text/html,application/xhtml+xml",
          "User-Agent": "Mozilla/5.0"
        },
        redirect: "follow"
      });
      const html = await upstream.text();

      // The public profile embeds this exact BPSTPH station object.
      // Restrict extraction to the known station ID to avoid the global
      // online-member count elsewhere in the same page payload.
      const idPosition = html.indexOf(STATION_ID);
      if (!upstream.ok || idPosition < 0) {
        return new Response(JSON.stringify({
          error: "BPSTPH station object not found",
          upstream_status: upstream.status,
          station_id: STATION_ID
        }), { status: 502, headers });
      }

      const stationContext = html.slice(idPosition, idPosition + 1800);
      const typeMatch = stationContext.match(/type.{0,20}?station/i);
      const countMatch = stationContext.match(/listener_count.{0,40}?(\\d+)/i);
      if (!typeMatch || !countMatch) {
        return new Response(JSON.stringify({
          error: "BPSTPH station object found, but its listener_count could not be parsed",
          station_id: STATION_ID,
          station_context: stationContext.slice(0, 700)
        }), { status: 502, headers });
      }

      const broadcastMatch = stationContext.match(/is_broadcasting.{0,20}?(true|false)/i);
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
