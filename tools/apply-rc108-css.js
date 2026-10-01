const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "css", "play.css");
let css = fs.readFileSync(file, "utf8");
if (css.includes("/* === rc108 Team UX + Avatar stage stability === */")) {
  console.log("css already patched");
  process.exit(0);
}

const block = `
/* === rc108 Team UX + Avatar stage stability === */
.scc-workshop-split {
  grid-template-columns: minmax(320px, 0.42fr) minmax(0, 0.58fr);
  gap: 18px;
}
.scc-avatar-stage { position: sticky; top: 84px; }
.scc-stage-frame {
  height: 360px;
  min-height: 360px;
  max-height: 360px;
  width: 100%;
}
.scc-stage-sprite {
  transition: none !important;
  animation: none !important;
}
.scc-stage-sprite.is-stage-pending { opacity: 0; }
.scc-stage-sprite.is-acquiring { animation: none !important; }

.scc-team-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.scc-team-count {
  margin: 0;
  padding: 8px 12px;
  border-radius: 999px;
  border: 2px solid #f3a0c8;
  background: linear-gradient(180deg, #fff, #ffe8f4);
  color: #1a2744;
  font-weight: 900;
  white-space: nowrap;
}
.scc-team-stage-wrap { margin: 0 0 14px; }
.scc-team-live-preview {
  margin: 0;
  border-radius: 18px;
  overflow: hidden;
  border: 2px solid rgba(243,160,200,.45);
  box-shadow: 0 10px 0 rgba(26,39,68,.08);
}

.team-party-strip.team-slots-party {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
  margin: 0 0 10px;
}
.team-party-chip.team-slot,
.team-party-chip.team-slot.empty,
.team-party-chip.team-slot.filled {
  min-height: 0;
  padding: 8px 6px 10px;
  gap: 4px;
  border-radius: 16px;
  grid-template-rows: none;
  background:
    radial-gradient(circle at 50% 18%, rgba(255,255,255,.95), transparent 42%),
    linear-gradient(180deg, #ffffff 0%, #eef7ff 100%);
  box-shadow: 0 3px 0 rgba(26,39,68,.08);
}
.team-party-chip .team-slot-ball {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #1a2744;
  background: linear-gradient(180deg, #ff6b6b, #c62828 48%, #fff 52%, #eee);
  color: #1a2744;
  font-size: 10px;
  font-weight: 900;
  line-height: 1;
}
.team-party-chip .team-slot-sprite {
  width: 64px;
  height: 64px;
}
.team-party-chip .team-slot img {
  width: 60px;
  height: 60px;
}
.team-party-chip .team-slot-name {
  font-size: 12px;
  max-width: 100%;
}
.team-party-chip .team-slot-meta {
  font-size: 10px;
  line-height: 1.1;
}
.team-party-chip .team-slot-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  pointer-events: none;
  transition: opacity .12s ease;
}
.team-party-chip.filled:hover .team-slot-actions,
.team-party-chip.filled:focus-within .team-slot-actions {
  opacity: 1;
  pointer-events: auto;
}
.team-slot-icon {
  min-width: 28px;
  min-height: 28px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid #c5d8ef;
  background: #fff;
  font-weight: 900;
  cursor: pointer;
}
.team-slot-icon.is-remove { color: #b03050; }

.scc-team-bg-compact {
  margin-top: 8px;
  padding: 12px;
  border-radius: 18px;
  border: 2px solid #bfe8f6;
  background: linear-gradient(180deg, #fff, #f3fbff);
}
.scc-team-bg-compact-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.scc-team-bg-browse {
  border-radius: 12px;
  border: 2px solid #f3a0c8;
  background: linear-gradient(180deg, #fff, #ffe8f4);
  padding: 8px 12px;
  font-weight: 800;
  cursor: pointer;
}
.scc-team-bg-carousel {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  gap: 8px;
  align-items: center;
}
.scc-team-bg-nav {
  height: 100%;
  min-height: 88px;
  border-radius: 14px;
  border: 2px solid #c5d8ef;
  background: #fff;
  font-size: 28px;
  font-weight: 900;
  color: #1a2744;
  cursor: pointer;
}
.scc-team-bg-current {
  display: grid;
  gap: 6px;
  justify-items: center;
  text-align: center;
  padding: 8px;
  border-radius: 16px;
  border: 2px solid #8fd4ef;
  background: #fff;
  cursor: default;
  font: inherit;
  color: inherit;
}
.scc-team-bg-current-thumb {
  display: block;
  width: min(100%, 420px);
  aspect-ratio: 16 / 9;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.85);
  background-size: cover;
  background-position: center;
  box-shadow: inset 0 0 0 1px rgba(26,39,68,.08);
}
.scc-team-bg-hint { margin: 8px 0 0; }
.scc-team-bg-modal .play-modal-card {
  width: min(920px, calc(100vw - 24px));
  max-height: min(86vh, 820px);
}
.scc-team-bg-modal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
  gap: 10px;
  max-height: min(56vh, 520px);
  overflow: auto;
  padding: 4px 2px 8px;
}

.team-bg-image {
  background-image:
    linear-gradient(180deg, rgba(12, 24, 48, .10), rgba(12, 24, 48, .22)),
    var(--team-bg-image);
  background-size: cover;
  background-position: calc(var(--team-bg-fx, .5) * 100%) calc(var(--team-bg-fy, .5) * 100%);
  background-repeat: no-repeat;
}
.tid-team-showcase.is-scene[data-has-image="1"] .tid-team-stage-veil {
  opacity: .35;
  background: linear-gradient(180deg, rgba(12,24,48,.04), rgba(12,24,48,.18) 70%, rgba(12,24,48,.34));
}
.tid-party-scene.is-depth {
  inset: 36px 14px 42px;
  align-items: end;
}
.tid-party-figure.is-back {
  transform: translateY(-18px) scale(.9);
  z-index: 1;
}
.tid-party-figure.is-front {
  transform: translateY(4px) scale(1.05);
  z-index: 2;
}
.tid-party-figure.is-back .tid-party-actor { min-height: 78px; }
.tid-party-figure.is-front .tid-party-actor { min-height: 96px; }
.tid-party-figure.is-back .tid-party-sprite { max-height: 100px; }
.tid-party-figure.is-front .tid-party-sprite { max-height: 128px; }
.tid-team-showcase.is-fanfare .tid-party-figure,
.tid-team-showcase.is-fanfare-soft .tid-party-figure {
  animation: tid-party-pop .42s ease both;
  animation-delay: calc(var(--i, 0) * 45ms);
}
@keyframes tid-party-pop {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
html[data-reduced-motion="1"] .tid-team-showcase.is-fanfare .tid-party-figure,
html[data-perf="low"] .tid-team-showcase.is-fanfare .tid-party-figure,
html[data-reduced-motion="1"] .tid-team-showcase.is-fanfare-soft .tid-party-figure,
html[data-perf="low"] .tid-team-showcase.is-fanfare-soft .tid-party-figure {
  animation: none;
}

/* Richer original era environments */
.team-bg-gen1-mono {
  image-rendering: pixelated;
  background-color: #9bbc0f;
  background-image:
    linear-gradient(180deg, transparent 0 52%, #8bac0f 52% 68%, #306230 68% 86%, #0f380f 86% 100%),
    repeating-linear-gradient(90deg, #9bbc0f 0 10px, #8bac0f 10px 12px),
    repeating-linear-gradient(0deg, transparent 0 7px, rgba(15,56,15,.28) 7px 8px);
  background-size: auto, 24px 24px, 8px 8px;
  box-shadow: inset 0 0 0 4px #0f380f, inset 0 0 0 8px #9bbc0f;
}
.team-bg-gen1-mono::before {
  content: "";
  position: absolute; inset: auto 8% 22% 8%; height: 18%;
  background:
    repeating-linear-gradient(90deg, #306230 0 18px, #0f380f 18px 22px),
    linear-gradient(180deg, #306230, #0f380f);
  border-radius: 2px 2px 0 0;
  opacity: .9;
  pointer-events: none;
}
.team-bg-gen2-color {
  image-rendering: pixelated;
  background:
    linear-gradient(180deg, #7ec8ff 0 34%, #57c057 34% 58%, #3aa03a 58% 74%, #c8a048 74% 100%),
    repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0 8px, transparent 8px 16px);
  box-shadow: inset 0 -34px 0 rgba(40,120,40,.22);
}
.team-bg-gen3-gba {
  image-rendering: pixelated;
  background:
    radial-gradient(ellipse at 50% 78%, rgba(255,255,200,.42), transparent 48%),
    linear-gradient(180deg, #68b8f0 0 30%, #90d060 30% 56%, #58a040 56% 78%, #d8b060 78% 100%);
  box-shadow: inset 0 -40px 0 rgba(80,140,40,.18);
}
.team-bg-gen4-ds {
  background:
    radial-gradient(ellipse at 28% 18%, rgba(255,255,255,.55), transparent 42%),
    radial-gradient(ellipse at 70% 30%, rgba(180,220,255,.35), transparent 45%),
    linear-gradient(165deg, #a8d8ff 0%, #7ec8a8 42%, #d0e878 74%, #f0d090 100%);
}
.team-bg-retro-battle {
  image-rendering: pixelated;
  background:
    radial-gradient(ellipse at 50% 82%, rgba(255,255,255,.55), transparent 46%),
    linear-gradient(180deg, #203060 0 28%, #4060a0 28% 48%, #80a0d0 48% 66%, #d0c070 66% 84%, #806030 84% 100%);
}
.team-bg-kanto-route {
  image-rendering: pixelated;
  background:
    linear-gradient(180deg, #88c8f8 0 30%, #60c060 30% 52%, #48a048 52% 68%, #c8a858 68% 100%),
    repeating-linear-gradient(90deg, rgba(255,255,255,.1) 0 12px, transparent 12px 24px);
  box-shadow: inset 0 -32px 0 rgba(80,140,40,.28);
}

@media (max-width: 980px) {
  .scc-workshop-split { grid-template-columns: 1fr; }
  .scc-avatar-stage { position: static; }
  .scc-stage-frame { height: 300px; min-height: 300px; max-height: 300px; }
  .team-party-strip.team-slots-party { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .team-party-strip.team-slots-party { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scc-team-bg-carousel { grid-template-columns: 36px minmax(0, 1fr) 36px; }
  .scc-team-head { flex-direction: column; }
  .tid-party-figure.is-back,
  .tid-party-figure.is-front { transform: none; }
}
`;

fs.writeFileSync(file, css.trimEnd() + "\n" + block);
console.log("css appended", block.length);
