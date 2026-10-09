/* Planned Operations presenter for admin-next.js after owner-approved SQL.
   NOT loaded by any HTML page. Do not add admin_live_snapshot to READ_RPCS
   until the RPC exists in production. Keep the UNAVAILABLE fallback until then. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PLAY_ADMIN_NEXT_SNAPSHOT = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FALLBACK_STATUS = "Live status unavailable in preview. Legacy Live Operations remains on the current Dashboard. This preview does not refresh, settle, or tick gameplay.";
  const DENIED_STATUS = "Live status is restricted to staff.";
  const LOADING_STATUS = "Loading live status…";
  const STALE_STATUS = "Live status may be stale. This preview does not tick or settle gameplay.";
  const PERMISSION = "LIVE permits · OFFLINE ends · Start is explicit";

  function card(label, value, state) {
    return { label, value, state };
  }

  function twitchCard(twitch) {
    if (!twitch || !twitch.state) return card("Twitch", "UNAVAILABLE", "unavailable");
    if (twitch.state === "LIVE") return card("Twitch", "LIVE", "active");
    if (twitch.state === "OFFLINE") return card("Twitch", "OFFLINE", "inactive");
    if (twitch.state === "STALE") return card("Twitch", "STALE", "unknown");
    if (twitch.state === "UNKNOWN") return card("Twitch", "UNKNOWN", "unknown");
    return card("Twitch", "UNAVAILABLE", "unavailable");
  }

  function rpgCard(rpg) {
    if (!rpg || !rpg.state) return card("Live RPG session", "UNAVAILABLE", "unavailable");
    if (rpg.state === "ACTIVE") return card("Live RPG session", "ACTIVE", "active");
    if (rpg.state === "INACTIVE") return card("Live RPG session", "INACTIVE", "inactive");
    if (rpg.state === "UNKNOWN") return card("Live RPG session", "UNKNOWN", "unknown");
    return card("Live RPG session", "UNAVAILABLE", "unavailable");
  }

  function encounterCard(enc) {
    if (!enc) return card("Current encounter", "UNAVAILABLE", "unavailable");
    if (!enc.present) return card("Current encounter", "NONE", "inactive");
    if (enc.inProgress) {
      const phase = enc.phase ? String(enc.phase).toUpperCase() : "IN PROGRESS";
      return card("Current encounter", phase, "active");
    }
    if (enc.cancelled) return card("Current encounter", "LAST RECORDED · CANCELLED", "inactive");
    if (enc.resolved) return card("Current encounter", "LAST RECORDED · RESOLVED", "inactive");
    return card("Current encounter", "LAST RECORDED", "unknown");
  }

  function directorCard(director) {
    if (!director || !director.status && !director.freshness) {
      return card("Director", "UNAVAILABLE", "unavailable");
    }
    if (director.freshness === "UNKNOWN" && !director.status) {
      return card("Director", "UNKNOWN", "unknown");
    }
    if (director.freshness === "STALE") {
      return card("Director", `${director.status || "RECORDED"} · STALE`, "unknown");
    }
    return card("Director", director.status || "RECORDED", director.freshness === "FRESH" ? "unknown" : "unknown");
  }

  function presentLiveOperations(input) {
    const error = input && input.error;
    if (error === "loading") {
      return {
        status: LOADING_STATUS,
        cards: [
          card("Twitch", "…", "unknown"),
          card("Live RPG session", "…", "unknown"),
          card("Current encounter", "…", "unknown"),
          card("Director", "…", "unknown"),
          card("Permission model", PERMISSION, null)
        ],
        poll: false,
        mutate: false
      };
    }
    if (error === "denied") {
      return {
        status: DENIED_STATUS,
        cards: [
          card("Twitch", "UNAVAILABLE", "unavailable"),
          card("Live RPG session", "UNAVAILABLE", "unavailable"),
          card("Current encounter", "UNAVAILABLE", "unavailable"),
          card("Director", "UNAVAILABLE", "unavailable"),
          card("Permission model", PERMISSION, null)
        ],
        poll: false,
        mutate: false
      };
    }
    if (error === "network" || error === "missing" || !input || !input.payload || input.payload.ok !== true) {
      return {
        status: FALLBACK_STATUS,
        cards: [
          card("Twitch", "UNAVAILABLE", "unavailable"),
          card("Live RPG session", "UNAVAILABLE", "unavailable"),
          card("Current encounter", "UNAVAILABLE", "unavailable"),
          card("Director", "UNAVAILABLE", "unavailable"),
          card("Permission model", PERMISSION, null)
        ],
        poll: false,
        mutate: false
      };
    }
    const payload = input.payload;
    const twitch = twitchCard(payload.twitch);
    const rpg = rpgCard(payload.rpgSession);
    const encounter = encounterCard(payload.encounter);
    const director = directorCard(payload.director);
    const stale = payload.twitch && payload.twitch.state === "STALE"
      || payload.director && payload.director.freshness === "STALE";
    let status = "Observation only. Twitch LIVE permits the Live RPG. It does not start it.";
    if (payload.twitch && payload.twitch.state === "LIVE" && payload.rpgSession && payload.rpgSession.state === "INACTIVE") {
      status = "Twitch is LIVE. Live RPG stays INACTIVE until staff Start it on the current Dashboard.";
    } else if (payload.twitch && payload.twitch.state === "LIVE" && payload.rpgSession && payload.rpgSession.state === "ACTIVE") {
      status = "Twitch is LIVE and a Live RPG session is ACTIVE.";
    } else if (payload.twitch && payload.twitch.state === "OFFLINE" && payload.rpgSession && payload.rpgSession.state === "INACTIVE") {
      status = "Twitch is OFFLINE. Live RPG is INACTIVE.";
    } else if (payload.rpgSession && payload.rpgSession.state === "UNKNOWN") {
      status = "Live RPG session state is UNKNOWN. This preview does not infer it from Twitch.";
    }
    if (stale) status = STALE_STATUS;
    return {
      status,
      cards: [twitch, rpg, encounter, director, card("Permission model", PERMISSION, null)],
      poll: false,
      mutate: false
    };
  }

  return {
    FALLBACK_STATUS,
    DENIED_STATUS,
    LOADING_STATUS,
    presentLiveOperations
  };
}));
