(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  function isShiny(row) {
    return String(row?.variant || "").includes("shiny");
  }

  function isReserved(row) {
    return Boolean(row?.reserved || row?.tradeReserved);
  }

  function itemQty(row) {
    if (row?.haveItemQty != null) return Number(row.haveItemQty) || 0;
    return row?.haveItem ? 1 : 0;
  }

  function canEvolve(row) {
    if (!row || row.terminal) return false;
    if (isReserved(row) || row.locked) return false;
    if (row.available != null) return Boolean(row.available);
    const candyOk = Number(row.haveCandy || 0) >= Number(row.candyCost || 0);
    const itemOk = !row.item || itemQty(row) > 0 || Boolean(row.haveItem) || Boolean(row.tradeReady);
    return candyOk && itemOk;
  }

  function cardKind(row) {
    if (!row) return "blocked";
    if (row.terminal) return "terminal";
    if (isReserved(row)) return "reserved";
    if (row.locked) return "locked";
    if (canEvolve(row)) return "ready";
    return "blocked";
  }

  function matchesFilter(row, filter, query) {
    const q = String(query || "").trim().toLowerCase();
    if (q) {
      const hay = [row.name, row.toName, row.familyName].map((bit) => String(bit || "").toLowerCase());
      if (!hay.some((bit) => bit.includes(q))) return false;
    }
    const mode = filter || "ready";
    if (mode === "ready") return canEvolve(row);
    if (mode === "candy") return Number(row.candyCost || 0) > Number(row.haveCandy || 0);
    if (mode === "item") return Boolean(row.item) && itemQty(row) < 1 && !row.tradeReady && !row.haveItem;
    if (mode === "shiny") return isShiny(row);
    if (mode === "favorites") return Boolean(row.favorite);
    return true;
  }

  function candyNeed(row) {
    return Math.max(0, Number(row?.candyCost || 0) - Number(row?.haveCandy || 0));
  }

  function isTradeMethod(row) {
    const method = String(row?.method || "").toUpperCase();
    return method.includes("TRADE") || row?.item === "linkingcord";
  }

  function lineLayout(members, next) {
    const nodes = Array.isArray(members) ? members.slice() : [];
    const edges = Array.isArray(next) ? next.slice() : [];
    const fromCount = {};
    edges.forEach((edge) => {
      const key = Number(edge.fromDex);
      fromCount[key] = (fromCount[key] || 0) + 1;
    });
    const branchFrom = Object.keys(fromCount).map(Number).filter((dex) => fromCount[dex] > 1);
    if (!branchFrom.length) {
      return { kind: "linear", nodes, branches: [] };
    }
    const source = branchFrom[0];
    const fromNode = nodes.find((row) => Number(row.dex) === source) || { dex: source, name: "Pokémon" };
    const targets = edges
      .filter((edge) => Number(edge.fromDex) === source)
      .map((edge) => nodes.find((row) => Number(row.dex) === Number(edge.toDex)) || { dex: edge.toDex, name: edge.toName });
    const leftover = nodes.filter((row) => Number(row.dex) !== source && !targets.some((item) => Number(item.dex) === Number(row.dex)));
    return { kind: "branch", from: fromNode, targets, leftover };
  }

  function kantoOnlyMembers(members) {
    return (members || []).filter((row) => Number(row.dex) >= 1 && Number(row.dex) <= 151);
  }

  function martHref(itemKey) {
    return "./store.html#evolution";
  }

  function pendingGuard() {
    let busy = false;
    return {
      begin() {
        if (busy) return false;
        busy = true;
        return true;
      },
      end() {
        busy = false;
      },
      get busy() {
        return busy;
      }
    };
  }

  function humanEvoError(raw, fallback) {
    const text = String(raw || "");
    if (/artwork|sprite|asset/i.test(text)) return "Evolution artwork isn't available yet.";
    if (/unlock/i.test(text)) return "Unlock this Pokémon before evolving it.";
    if (/reserved|trade listing|active trade/i.test(text)) return "This Pokémon cannot evolve while it is part of an active trade.";
    if (/linking cord|trade, or with/i.test(text)) return "You need a Linking Cord, or a trade evolution.";
    if (/more Evolution Candy|Needs more Candy|need \d+ more/i.test(text)) return text;
    if (/Thunder Stone|Fire Stone|Water Stone|Leaf Stone|Moon Stone|you need a/i.test(text)) return text;
    if (/not in your collection/i.test(text)) return "That Pokémon is not in your collection.";
    if (/not available/i.test(text)) return "That evolution is not available.";
    return fallback || text || "Evolution could not finish.";
  }

  function resultModel(result, pick) {
    const evo = result?.evolution || {};
    const rewards = result?.rewards || {};
    const spent = result?.spent || {};
    return {
      fromName: evo.fromName || pick?.name || "Pokémon",
      toName: evo.toName || pick?.toName || "Pokémon",
      fromDex: evo.fromDex || pick?.dex,
      toDex: evo.toDex || pick?.toDex,
      variant: evo.variant || pick?.variant || "normal",
      gender: evo.gender || pick?.gender || "",
      level: evo.level != null ? evo.level : pick?.level,
      trainerXp: Number(rewards.trainerXp || 0),
      masteryFrom: Number(rewards.masteryFrom || 0),
      masteryTo: Number(rewards.masteryTo || 0),
      newDex: Boolean(rewards.newDex),
      newDexXp: Number(rewards.newDexXp || 0),
      coins: Number(rewards.coins || 0),
      candySpent: Number(spent.evolutionCandy || 0),
      itemSpent: spent.item || "",
      already: /already evolved/i.test(String(result?.message || ""))
    };
  }

  function evolveLabel(row) {
    if (!canEvolve(row)) return "";
    if (row.tradeReady && Number(row.candyCost) === 0) return `Evolve ${row.name}`;
    if (row.item === "linkingcord") return "Use Linking Cord & Evolve";
    if (row.item && /stone$/i.test(row.item)) return `Use ${itemLabel(row.item)} & Evolve`;
    return `Evolve ${row.name}`;
  }

  function itemLabel(key) {
    if (root.playItemLabel) return root.playItemLabel(key);
    if (!key) return "";
    if (key === "linkingcord") return "Linking Cord";
    return String(key).replace(/stone$/i, " Stone").replace(/^\w/, (ch) => ch.toUpperCase());
  }

  root.playEvoView = {
    isShiny,
    isReserved,
    itemQty,
    canEvolve,
    cardKind,
    matchesFilter,
    candyNeed,
    isTradeMethod,
    lineLayout,
    kantoOnlyMembers,
    martHref,
    pendingGuard,
    humanEvoError,
    resultModel,
    evolveLabel,
    itemLabel
  };
})();
