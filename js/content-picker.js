(() => {
  const root = typeof window !== "undefined" ? window : globalThis;

  function esc(value) {
    return typeof root.playEscapeAttr === "function"
      ? root.playEscapeAttr(value)
      : String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function art(row) {
    if (row.kind === "avatar") {
      if (typeof root.playTrainerPortraitUrl === "function") return root.playTrainerPortraitUrl(row.key);
      return `images/trainers/${row.key}.${row.ext || "png"}`;
    }
    if (typeof root.playItemSprite === "function") return root.playItemSprite(row.key || row.icon);
    return `images/items/${row.key || "poke-ball.png"}`;
  }

  function flatten(data, kind) {
    const rows = [];
    const take = (list) => (Array.isArray(list) ? list : []).forEach((row) => rows.push(row));
    if (!kind || kind === "all" || kind === "items" || kind === "balls" || kind === "berries") take(data.items);
    if (!kind || kind === "all" || kind === "avatars") take(data.avatars);
    if (!kind || kind === "all" || kind === "packs" || kind === "avatars") take(data.avatarPacks);
    if (!kind || kind === "all" || kind === "cosmetics") take(data.cosmetics);
    return rows;
  }

  function ensureDialog() {
    let dialog = document.getElementById("content-picker");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "content-picker";
    dialog.className = "play-modal play-modal-wide studio-picker";
    dialog.innerHTML = `
      <form class="play-modal-card" method="dialog">
        <header class="play-modal-head">
          <h3 id="picker-title">Add content</h3>
          <button class="secondary" value="cancel" type="submit">Close</button>
        </header>
        <div class="studio-picker-tools">
          <label class="field" for="picker-q">Search
            <input id="picker-q" type="search" placeholder="Great Ball, Razz, Red…">
          </label>
          <label class="field" for="picker-kind">Filter
            <select id="picker-kind">
              <option value="all">All</option>
              <option value="items">Items</option>
              <option value="balls">Poké Balls</option>
              <option value="berries">Berries</option>
              <option value="avatars">Trainer avatars</option>
              <option value="packs">Avatar packs</option>
              <option value="cosmetics">Cosmetics</option>
            </select>
          </label>
          <label class="field" for="picker-qty">Quantity
            <input id="picker-qty" type="number" min="1" step="1" value="1">
          </label>
        </div>
        <div id="picker-grid" class="studio-picker-grid"></div>
        <p id="picker-status" class="muted" role="status"></p>
      </form>`;
    document.body.appendChild(dialog);
    return dialog;
  }

  root.playContentPicker = {
    async load(q, kind) {
      return root.playCall("admin_content_picker", { p_q: q || null, p_kind: kind || "all" });
    },
    flatten,
    async open(opts) {
      const options = opts || {};
      const dialog = ensureDialog();
      const qEl = dialog.querySelector("#picker-q");
      const kindEl = dialog.querySelector("#picker-kind");
      const qtyEl = dialog.querySelector("#picker-qty");
      const grid = dialog.querySelector("#picker-grid");
      const status = dialog.querySelector("#picker-status");
      dialog.querySelector("#picker-title").textContent = options.title || "Add content";
      kindEl.value = options.kind || "all";
      qtyEl.value = String(options.qty || 1);
      qtyEl.closest(".field").hidden = options.qty === false;
      let cache = { items: [], avatars: [], avatarPacks: [], cosmetics: [] };
      const draw = () => {
        const q = String(qEl.value || "").toLowerCase();
        const rows = flatten(cache, kindEl.value).filter((row) => {
          if (!q) return true;
          return `${row.name} ${row.key} ${row.category || ""} ${row.pack || ""}`.toLowerCase().includes(q);
        });
        grid.innerHTML = rows.length
          ? rows.map((row) => `
            <button class="studio-pick" type="button" data-kind="${esc(row.kind)}" data-key="${esc(row.key)}">
              <img src="${esc(art(row))}" alt="">
              <strong>${esc(row.name || row.key)}</strong>
              <span>${esc(row.category || row.pack || row.slot || row.kind)}</span>
            </button>`).join("")
          : `<p class="muted">No matching content.</p>`;
      };
      const refresh = async () => {
        status.textContent = "Loading…";
        try {
          cache = await root.playContentPicker.load(qEl.value, kindEl.value);
          status.textContent = "";
          draw();
        } catch (error) {
          status.textContent = root.playRpcError?.(error, "Could not load content.") || String(error);
        }
      };
      return new Promise((resolve) => {
        const finish = (row) => {
          cleanup();
          try { dialog.close(); } catch (_) {}
          resolve(row || null);
        };
        const onGrid = (event) => {
          const btn = event.target.closest("[data-key]");
          if (!btn) return;
          const qty = Math.max(1, Number(qtyEl.value || 1));
          finish({
            kind: btn.dataset.kind,
            key: btn.dataset.key,
            qty,
            name: btn.querySelector("strong")?.textContent || btn.dataset.key
          });
        };
        const onClose = () => finish(null);
        const cleanup = () => {
          grid.removeEventListener("click", onGrid);
          qEl.removeEventListener("input", draw);
          kindEl.removeEventListener("change", refresh);
          dialog.removeEventListener("close", onClose);
        };
        grid.addEventListener("click", onGrid);
        qEl.addEventListener("input", draw);
        kindEl.addEventListener("change", refresh);
        dialog.addEventListener("close", onClose);
        refresh();
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
        qEl.focus();
      });
    }
  };
})();
