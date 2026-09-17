(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const SIZE = 256;
  const MARGIN = 0.12;

  function alphaAt(data, w, x, y) {
    return data[((y * w) + x) * 4 + 3];
  }

  root.playPortraitVisibleBounds = function playPortraitVisibleBounds(data, width, height, alphaMin) {
    const minA = Number(alphaMin || 8);
    const w = Number(width) || 0;
    const h = Number(height) || 0;
    let left = w;
    let top = h;
    let right = -1;
    let bottom = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (alphaAt(data, w, x, y) >= minA) {
          if (x < left) left = x;
          if (y < top) top = y;
          if (x > right) right = x;
          if (y > bottom) bottom = y;
        }
      }
    }
    if (right < 0) {
      return { left: 0, top: 0, right: Math.max(w - 1, 0), bottom: Math.max(h - 1, 0), empty: true };
    }
    return { left, top, right, bottom, empty: false };
  };

  root.playPortraitCropRect = function playPortraitCropRect(bounds, width, height, opts) {
    const options = opts || {};
    const w = Math.max(1, Number(width) || 1);
    const h = Math.max(1, Number(height) || 1);
    const box = bounds && !bounds.empty
      ? bounds
      : { left: 0, top: 0, right: w - 1, bottom: h - 1 };
    const charW = Math.max(1, box.right - box.left + 1);
    const charH = Math.max(1, box.bottom - box.top + 1);
    const margin = Math.min(0.22, Math.max(0.08, Number(options.margin == null ? MARGIN : options.margin)));
    const headH = charH * 0.58;
    let cx = box.left + charW / 2 + (Number(options.x) || 0) * charW;
    let cy = box.top + headH * 0.42 + (Number(options.y) || 0) * charH;
    const zoom = Math.min(2.4, Math.max(0.7, Number(options.zoom) || 1));
    let size = Math.max(charW, headH) * (1 + margin) / zoom;
    size = Math.max(8, Math.min(size, Math.max(w, h)));
    let sx = Math.round(cx - size / 2);
    let sy = Math.round(cy - size / 2);
    sx = Math.max(0, Math.min(sx, w - size));
    sy = Math.max(0, Math.min(sy, h - size));
    if (sx + size > w) size = w - sx;
    if (sy + size > h) size = h - sy;
    return {
      sx: Math.max(0, sx),
      sy: Math.max(0, sy),
      sw: Math.max(1, Math.round(size)),
      sh: Math.max(1, Math.round(size))
    };
  };

  function detectPixel(img, kind) {
    if (kind === "rendered") return false;
    if (kind === "pixel") return true;
    const w = img.naturalWidth || img.width || 0;
    return w > 0 && w <= 320;
  }

  root.playPortraitIsPixel = detectPixel;

  function drawCrop(img, rect, pixel) {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = !pixel;
    ctx.imageSmoothingQuality = pixel ? "low" : "high";
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(img, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, SIZE, SIZE);
    return canvas;
  }

  root.playPortraitRender = function playPortraitRender(img, opts) {
    const options = opts || {};
    const canvas = document.createElement("canvas");
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;
    const bounds = root.playPortraitVisibleBounds(data, w, h);
    const rect = root.playPortraitCropRect(bounds, w, h, options);
    const pixel = detectPixel(img, options.kind);
    return {
      bounds,
      rect,
      pixel,
      canvas: drawCrop(img, rect, pixel)
    };
  };

  root.playLoadImage = function playLoadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not load that image."));
      img.src = src;
    });
  };

  root.playPortraitDataUrl = function playPortraitDataUrl(canvas) {
    return canvas.toDataURL("image/png");
  };

  root.playPortraitBlob = function playPortraitBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not write the portrait.")), "image/png");
    });
  };
})();
