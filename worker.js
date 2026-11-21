const PROFILE = "https://stationhead.com/bpstph";

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

      // Stationhead embeds BPSTPH's station object in its page payload.
      // Match the listener_count belonging to an object whose type is "station";
      // do not use the unrelated global online_member_count/listener_count.
      const stationPattern = /\\?"type\\?"\s*:\s*\\?"station\\?"[\\s\\S]{0,5000}?\\?"listener_count\\?"\s*:\s*(\\d+)/g;
      const matches = [...html.matchAll(stationPattern)];

      if (!upstream.ok || matches.length === 0) {
        return new Response(JSON.stringify({
          error: "BPSTPH station listener count not found",
          upstream_status: upstream.status,
          final_url: upstream.url
        }), { status: 502, headers });
      }

      const listenerCount = Number(matches[0][1]);
      const stationContext = matches[0][0];
      const broadcastingMatch = stationContext.match(/\\?"is_broadcasting\\?"\s*:\s*(true|false)/);
      const broadcasting = broadcastingMatch ? broadcastingMatch[1] === "true" : null;
      const stationIdMatch = stationContext.match(/\\?"id\\?"\s*:\s*(\\d+)/);
      const stationId = stationIdMatch ? stationIdMatch[1] : null;

      return new Response(JSON.stringify({
        listeners: listenerCount,
        is_broadcasting: broadcasting,
        station_id: stationId,
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
