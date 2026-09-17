/* Generate 256×256 trainer portraits with the Play crop algorithm. Originals are never overwritten. */
globalThis.window = globalThis;
require("../js/play-portrait.js");

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SIZE = 256;
const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "images", "trainers");
const DEST = path.join(SRC, "portraits");
const SKIP = new Set(["premium-avatars.png"]);

function loadRgba(file) {
  const py = [
    "from PIL import Image",
    "import sys, struct",
    "im = Image.open(sys.argv[1]).convert('RGBA')",
    "sys.stdout.buffer.write(struct.pack('<II', im.width, im.height))",
    "sys.stdout.buffer.write(im.tobytes())"
  ].join("; ");
  const result = spawnSync("python", ["-c", py, file], {
    maxBuffer: 80 * 1024 * 1024,
    encoding: "buffer"
  });
  if (result.status) {
    throw new Error(String(result.stderr || "png load failed"));
  }
  const buf = result.stdout;
  const width = buf.readUInt32LE(0);
  const height = buf.readUInt32LE(4);
  const data = new Uint8ClampedArray(buf.buffer, buf.byteOffset + 8, width * height * 4);
  return { width, height, data };
}

function writePng(file, rgba) {
  const py = [
    "from PIL import Image",
    "import sys",
    "im = Image.frombytes('RGBA', (256, 256), sys.stdin.buffer.read())",
    "im.save(sys.argv[1], 'PNG')"
  ].join("; ");
  const result = spawnSync("python", ["-c", py, file], {
    input: rgba,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.status) {
    throw new Error(String(result.stderr || "png write failed"));
  }
}

function sampleNearest(src, w, h, x, y) {
  const sx = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const i = ((sy * w) + sx) * 4;
  return [src[i], src[i + 1], src[i + 2], src[i + 3]];
}

function sampleBilinear(src, w, h, x, y) {
  const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(w - 1, x0 + 1));
  const y1 = Math.max(0, Math.min(h - 1, y0 + 1));
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const mix = (a, b, t) => a + ((b - a) * t);
  const at = (sx, sy) => {
    const i = ((sy * w) + sx) * 4;
    return [src[i], src[i + 1], src[i + 2], src[i + 3]];
  };
  const p00 = at(x0, y0);
  const p10 = at(x1, y0);
  const p01 = at(x0, y1);
  const p11 = at(x1, y1);
  return [0, 1, 2, 3].map((c) => Math.round(mix(
    mix(p00[c], p10[c], fx),
    mix(p01[c], p11[c], fx),
    fy
  )));
}

function scaleRect(src, w, h, rect, pixel) {
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const u = rect.sx + ((x + 0.5) * rect.sw / SIZE);
      const v = rect.sy + ((y + 0.5) * rect.sh / SIZE);
      const px = pixel ? sampleNearest(src, w, h, u, v) : sampleBilinear(src, w, h, u, v);
      const i = ((y * SIZE) + x) * 4;
      out[i] = px[0];
      out[i + 1] = px[1];
      out[i + 2] = px[2];
      out[i + 3] = px[3];
    }
  }
  return out;
}

function looksFromDisk() {
  return fs.readdirSync(SRC)
    .filter((name) => /\.png$/i.test(name) && !SKIP.has(name.toLowerCase()))
    .map((name) => ({
      id: name.replace(/\.png$/i, ""),
      file: path.join(SRC, name)
    }));
}

function generateOne(look, kind) {
  const img = loadRgba(look.file);
  const bounds = globalThis.playPortraitVisibleBounds(img.data, img.width, img.height);
  const rect = globalThis.playPortraitCropRect(bounds, img.width, img.height);
  const pixel = kind === "rendered"
    ? false
    : (kind === "pixel" || img.width <= 320);
  const rgba = scaleRect(img.data, img.width, img.height, rect, pixel);
  const dest = path.join(DEST, `${look.id}-portrait.png`);
  writePng(dest, rgba);
  return { id: look.id, bounds, rect, pixel, width: img.width, height: img.height };
}

function main() {
  fs.mkdirSync(DEST, { recursive: true });
  const looks = looksFromDisk();
  const report = [];
  looks.forEach((look, index) => {
    const row = generateOne(look, "pixel");
    report.push(row);
    if ((index + 1) % 20 === 0 || index + 1 === looks.length) {
      console.log(`generated ${index + 1}/${looks.length}`);
    }
  });
  const reportPath = path.join(DEST, "_crop-report.json");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`wrote ${report.length} portraits to ${DEST}`);
}

main();
