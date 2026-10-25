/* Preview-only Live Operations presenter. Observation, never mutation. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PLAY_ADMIN_NEXT_SNAPSHOT = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const FALLBACK_STATUS = "Live status is unavailable. Reload Operations to try again.";
  const DENIED_STATUS = "Live status is restricted to staff.";
  const LOADING_STATUS = "Loading live status…";
  const STALE_STATUS = "Twitch status may be out of date. Check the observation time before acting; the director's last activity does not confirm current Twitch status.";
  const PERMISSION = "LIVE permits · OFFLINE ends · Start is explicit";
  const DASH = "—";

  function card(label, value, state, meta) {
    return { label, value, state, meta: meta || [] };
  }

  function metaRow(label, value) {
    return { label, value: value == null || value === "" ? DASH : String(value) };
  }

  function formatStamp(value) {
    if (value == null || value === "") return DASH;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return DASH;
    return date.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC").replace("Z", " UTC");
  }

  function formatDex(value) {
    if (value == null || value === "") return DASH;
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return `#${String(Math.trunc(num)).padStart(3, "0")}`;
  }

  function fallbackCards(twitchValue, twitchState) {
    return [
      card("Twitch", twitchValue, twitchState),
      card("Live RPG session", "UNAVAILABLE", "unavailable"),
      card("Director", "UNAVAILABLE", "unavailable"),
      card("Current encounter", "UNAVAILABLE", "unavailable"),
      card("Last recorded encounter", "UNAVAILABLE", "unavailable"),
      card("Settlement", "UNAVAILABLE", "unavailable"),
      card("Permission model", PERMISSION, null)
    ];
  }

  function twitchCard(twitch) {
    if (!twitch || !twitch.state) return card("Twitch", "UNAVAILABLE", "unavailable");
    const meta = [
      metaRow("Last checked", formatStamp(twitch.checkedAt)),
      metaRow("Title", twitch.title || DASH)
    ];
    if (twitch.state === "LIVE") return card("Twitch", "LIVE", "active", meta);
    if (twitch.state === "OFFLINE") return card("Twitch", "OFFLINE", "inactive", meta);
    if (twitch.state === "STALE") return card("Twitch", "STALE", "unknown", meta);
    if (twitch.state === "UNKNOWN") return card("Twitch", "UNKNOWN", "unknown", meta);
    return card("Twitch", "UNAVAILABLE", "unavailable", meta);
  }

  function rpgCard(rpg) {
    if (!rpg || !rpg.state) return card("Live RPG session", "UNAVAILABLE", "unavailable");
    const meta = [
      metaRow("Session", rpg.sessionId || DASH),
      metaRow("Started", formatStamp(rpg.startedAt)),
      metaRow("Session row", rpg.sessionRowPresent === true ? "present" : rpg.sessionRowPresent === false ? "missing" : DASH)
    ];
    if (rpg.state === "ACTIVE") return card("Live RPG session", "ACTIVE", "active", meta);
    if (rpg.state === "INACTIVE") return card("Live RPG session", "INACTIVE", "inactive", meta);
    if (rpg.state === "UNKNOWN") return card("Live RPG session", "UNKNOWN", "unknown", meta);
    return card("Live RPG session", "UNAVAILABLE", "unavailable", meta);
  }

  function directorCard(director) {
    if (!director) return card("Director", "UNAVAILABLE", "unavailable");
    const meta = [
      metaRow("Last tick", formatStamp(director.lastTickAt)),
      metaRow("Last update", formatStamp(director.updatedAt))
    ];
    if (!director.status) return card("Director", "UNKNOWN", "unknown", meta);
    return card("Director", director.status, "unknown", meta);
  }

  function encounterMeta(row) {
    if (!row) return [];
    return [
      metaRow("Species", row.name || DASH),
      metaRow("Pokédex", formatDex(row.dex)),
      metaRow("Variant", row.variant || DASH),
      metaRow("Started", formatStamp(row.startedAt)),
      metaRow("Paused", row.paused === true ? "yes" : row.paused === false ? "no" : DASH)
    ];
  }

  function encounterCard(payload) {
    if (!payload || !Object.prototype.hasOwnProperty.call(payload, "currentEncounter")) {
      return card("Current encounter", "UNAVAILABLE", "unavailable");
    }
    const cur = payload.currentEncounter;
    if (!cur) return card("Current encounter", "NONE", "inactive", [
      metaRow("Note", "Director pointer is not an open encounter")
    ]);
    const phase = cur.phase ? String(cur.phase).toUpperCase() : "IN PROGRESS";
    return card("Current encounter", phase, "active", encounterMeta(cur));
  }

  function lastEncounterCard(payload) {
    if (!payload || !Object.prototype.hasOwnProperty.call(payload, "lastEncounter")) {
      return card("Last recorded encounter", "UNAVAILABLE", "unavailable");
    }
    const last = payload.lastEncounter;
    if (!last) return card("Last recorded encounter", "NONE", "inactive");
    const phase = last.phase ? String(last.phase).toUpperCase() : DASH;
    const note = last.inProgress
      ? "Director pointer; still open"
      : "Historical pointer. Not current merely because the director retains it.";
    return card("Last recorded encounter", phase, last.inProgress ? "unknown" : "inactive", [
      ...encounterMeta(last),
      metaRow("Note", note)
    ]);
  }

  function settlementCard(payload) {
    const settlement = payload && payload.settlement;
    if (!settlement || !settlement.state) {
      return card("Settlement", "UNAVAILABLE", "unavailable", [
        metaRow("Awaiting", DASH)
      ]);
    }
    return card("Settlement", String(settlement.state), "unavailable", [
      metaRow("Awaiting", settlement.awaiting == null ? DASH : String(settlement.awaiting))
    ]);
  }

  function presentLiveOperations(input) {
    const error = input && input.error;
    if (error === "loading") {
      return {
        status: LOADING_STATUS,
        freshness: DASH,
        cards: [
          card("Twitch", "…", "unknown"),
          card("Live RPG session", "…", "unknown"),
          card("Director", "…", "unknown"),
          card("Current encounter", "…", "unknown"),
          card("Last recorded encounter", "…", "unknown"),
          card("Settlement", "UNAVAILABLE", "unavailable"),
          card("Permission model", PERMISSION, null)
        ],
        poll: false,
        mutate: false
      };
    }
    if (error === "denied") {
      return {
        status: DENIED_STATUS,
        freshness: DASH,
        cards: fallbackCards("UNAVAILABLE", "unavailable"),
        poll: false,
        mutate: false
      };
    }
    if (error === "network" || error === "missing" || !input || !input.payload || input.payload.ok !== true) {
      return {
        status: FALLBACK_STATUS,
        freshness: DASH,
        cards: fallbackCards("UNAVAILABLE", "unavailable"),
        poll: false,
        mutate: false
      };
    }
    const payload = input.payload;
    const twitch = twitchCard(payload.twitch);
    const rpg = rpgCard(payload.rpgSession);
    const director = directorCard(payload.director);
    const encounter = encounterCard(payload);
    const last = lastEncounterCard(payload);
    const settlement = settlementCard(payload);
    const stale = payload.twitch && payload.twitch.state === "STALE";
    let status = "Observation only. Twitch LIVE permits the Live RPG. It does not start it.";
    if (payload.twitch && payload.twitch.state === "LIVE" && payload.rpgSession && payload.rpgSession.state === "INACTIVE") {
      status = "Twitch is LIVE. Live RPG stays INACTIVE until staff Start it explicitly.";
    } else if (payload.twitch && payload.twitch.state === "LIVE" && payload.rpgSession && payload.rpgSession.state === "ACTIVE") {
      status = "Twitch is LIVE and a Live RPG session is ACTIVE.";
    } else if (payload.twitch && payload.twitch.state === "OFFLINE" && payload.rpgSession && payload.rpgSession.state === "INACTIVE") {
      status = "Twitch is OFFLINE. Live RPG is INACTIVE.";
    } else if (payload.twitch && payload.twitch.state === "STALE") {
      status = STALE_STATUS;
    } else if (payload.rpgSession && payload.rpgSession.state === "UNKNOWN") {
      status = "Live RPG status could not be confirmed. Twitch status is shown separately.";
    }
    if (stale) status = STALE_STATUS;
    return {
      status,
      freshness: formatStamp(payload.asOf),
      cards: [twitch, rpg, director, encounter, last, settlement, card("Permission model", PERMISSION, null)],
      poll: false,
      mutate: false
    };
  }

  return {
    FALLBACK_STATUS,
    DENIED_STATUS,
    LOADING_STATUS,
    STALE_STATUS,
    presentLiveOperations
  };
}));
