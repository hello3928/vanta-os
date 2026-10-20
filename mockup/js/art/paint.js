// Painted scene generator for placeholder key art. Everything is drawn in code, so it's original.
// Scenes use atmospheric perspective (far layers fade into the fog color) and a light grain to read
// as painted key art rather than flat vector shapes.

export function rngFrom(seed) {
  let x = 2166136261;
  for (const c of String(seed)) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  return () => {
    x = Math.imul(x ^ (x >>> 15), 2246822507);
    x = Math.imul(x ^ (x >>> 13), 3266489909);
    return ((x ^= x >>> 16) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(' ')})`;
}
export function rgba(hex, a) {
  return `rgb(${hexToRgb(hex).join(' ')} / ${a})`;
}

// ---------- primitives ----------

function sky(ctx, w, h, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function stars(ctx, w, h, n, rng, color = '#ffffff') {
  for (let i = 0; i < n; i++) {
    const s = rng() < 0.08 ? 2 : 1;
    ctx.fillStyle = rgba(color, 0.25 + rng() * 0.7);
    ctx.fillRect(rng() * w, rng() * h, s * (w / 800), s * (w / 800));
  }
}

function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function sun(ctx, x, y, r, color) {
  glow(ctx, x, y, r * 6, color, 0.35);
  glow(ctx, x, y, r * 2.2, color, 0.5);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Midpoint-displacement ridge. Returns yAt(x) so trees and buildings can sit on it.
function ridge(ctx, w, h, { base, amp, rough = 0.5, color, rng, seg = 128 }) {
  const pts = new Array(seg + 1).fill(0);
  pts[0] = rng();
  pts[seg] = rng();
  let step = seg;
  let disp = 1;
  while (step > 1) {
    const half = step / 2;
    for (let i = half; i < seg; i += step) pts[i] = (pts[i - half] + pts[i + half]) / 2 + (rng() - 0.5) * disp;
    disp *= rough;
    step = half;
  }
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const ys = pts.map((p) => base - ((p - min) / (max - min || 1)) * amp);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ys.forEach((y, i) => ctx.lineTo((i / seg) * w, y));
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  return (x) => {
    const f = Math.max(0, Math.min(seg, (x / w) * seg));
    const i = Math.floor(f);
    const t = f - i;
    return ys[i] + ((ys[Math.min(seg, i + 1)] ?? ys[i]) - ys[i]) * t;
  };
}

function fog(ctx, w, y, height, color, alpha) {
  const g = ctx.createLinearGradient(0, y - height, 0, y + height);
  g.addColorStop(0, rgba(color, 0));
  g.addColorStop(0.5, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - height, w, height * 2);
}

function pine(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  for (let k = 0; k < 3; k++) {
    const top = y - size * (0.45 + k * 0.28);
    const half = size * (0.3 - k * 0.07);
    ctx.beginPath();
    ctx.moveTo(x, top - size * 0.35);
    ctx.lineTo(x + half, top + size * 0.15);
    ctx.lineTo(x - half, top + size * 0.15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(x - size * 0.03, y - size * 0.35, size * 0.06, size * 0.35);
}

function forestOn(ctx, yAt, w, { count, size, color, rng }) {
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    pine(ctx, x, yAt(x) + size * 0.1, size * (0.6 + rng() * 0.6), color);
  }
}

function rays(ctx, x, y, w, h, color, rng, n = 7) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = Math.PI / 2 + (rng() - 0.5) * 1.2;
    const spread = 0.03 + rng() * 0.05;
    const len = h * 1.6;
    ctx.fillStyle = rgba(color, 0.05 + rng() * 0.06);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - spread) * len, y + Math.sin(a - spread) * len);
    ctx.lineTo(x + Math.cos(a + spread) * len, y + Math.sin(a + spread) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function clouds(ctx, w, h, { y, n, color, alpha, rng, blur = 30 }) {
  ctx.save();
  ctx.filter = `blur(${(blur * w) / 800}px)`;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = rgba(color, alpha * (0.5 + rng() * 0.5));
    ctx.beginPath();
    ctx.ellipse(rng() * w, y + (rng() - 0.5) * h * 0.12, w * (0.12 + rng() * 0.2), h * (0.03 + rng() * 0.04), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function skyline(ctx, w, base, { color, window: win, density = 0.35, minH, maxH, rng }) {
  let x = -rng() * 20;
  while (x < w) {
    const bw = w * (0.03 + rng() * 0.06);
    const bh = minH + rng() * (maxH - minH);
    ctx.fillStyle = color;
    ctx.fillRect(x, base - bh, bw, bh + 2);
    if (rng() < 0.3) ctx.fillRect(x + bw * 0.45, base - bh - bh * 0.15, Math.max(1, bw * 0.06), bh * 0.15);
    if (win) {
      const cell = Math.max(2, w / 260);
      for (let wy = base - bh + cell * 2; wy < base - cell; wy += cell * 2.2) {
        for (let wx = x + cell; wx < x + bw - cell; wx += cell * 2) {
          if (rng() < density) {
            ctx.fillStyle = rgba(win[Math.floor(rng() * win.length)], 0.5 + rng() * 0.5);
            ctx.fillRect(wx, wy, cell, cell * 1.1);
          }
        }
      }
    }
    x += bw + w * 0.004;
  }
}

function castle(ctx, cx, base, s, color, lit) {
  ctx.fillStyle = color;
  const tower = (x, tw, th, roof) => {
    ctx.fillRect(x - tw / 2, base - th, tw, th + 2);
    ctx.beginPath();
    ctx.moveTo(x - tw * 0.65, base - th);
    ctx.lineTo(x, base - th - roof);
    ctx.lineTo(x + tw * 0.65, base - th);
    ctx.closePath();
    ctx.fill();
  };
  ctx.fillRect(cx - s * 0.9, base - s * 0.55, s * 1.8, s * 0.6);
  tower(cx, s * 0.32, s * 1.25, s * 0.5);
  tower(cx - s * 0.62, s * 0.24, s * 0.9, s * 0.38);
  tower(cx + s * 0.62, s * 0.24, s * 0.95, s * 0.4);
  tower(cx - s * 1.0, s * 0.16, s * 0.65, s * 0.26);
  tower(cx + s * 1.02, s * 0.16, s * 0.7, s * 0.28);
  for (let i = -8; i <= 8; i++) ctx.fillRect(cx + i * s * 0.1 - s * 0.03, base - s * 0.62, s * 0.06, s * 0.08);
  if (lit) {
    ctx.fillStyle = lit;
    [[0, 0.95], [-0.62, 0.65], [0.62, 0.7], [0.08, 0.6]].forEach(([dx, dy]) => ctx.fillRect(cx + dx * s - s * 0.025, base - dy * s, s * 0.05, s * 0.08));
  }
}

function waves(ctx, w, h, { top, rows, color, crest, rng }) {
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1);
    const y = top + (h - top) * Math.pow(t, 1.6);
    const amp = (h / 160) * (1 + t * 5);
    const len = w * (0.05 + t * 0.12);
    const phase = rng() * Math.PI * 2;
    ctx.fillStyle = color(t);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += w / 120) ctx.lineTo(x, y + Math.sin(x / len + phase) * amp);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    if (crest && t > 0.25) {
      ctx.strokeStyle = rgba(crest, 0.12 + t * 0.25);
      ctx.lineWidth = Math.max(1, (w / 800) * (1 + t * 2));
      ctx.beginPath();
      for (let x = 0; x <= w; x += w / 120) {
        const yy = y + Math.sin(x / len + phase) * amp;
        if (Math.sin(x / len + phase) < -0.7) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      }
      ctx.stroke();
    }
  }
}

function planet(ctx, x, y, r, base, shade, rim) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, base);
  g.addColorStop(1, shade);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? base : shade;
    ctx.fillRect(x - r, y - r + (i / 9) * r * 2, r * 2, r * 0.08);
  }
  ctx.restore();
  ctx.strokeStyle = rgba(rim, 0.8);
  ctx.lineWidth = r * 0.02;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
  glow(ctx, x, y, r * 1.35, rim, 0.12);
}

function grain(ctx, w, h, rng, amount = 0.05) {
  const size = 96;
  const c = new OffscreenCanvasLike(size, size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rng() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255 * amount;
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(c, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function vignette(ctx, w, h, strength = 0.55) {
  const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.8);
  g.addColorStop(0, 'rgb(0 0 0 / 0)');
  g.addColorStop(1, `rgb(0 0 0 / ${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function OffscreenCanvasLike(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- scenes ----------
// Each scene draws into (ctx, w, h) using palette p and a seeded rng.

const SCENES = {
  peaks(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    if (p.night) stars(ctx, w, h * 0.55, 260, rng);
    sun(ctx, w * p.sunX, h * p.sunY, Math.min(w, h) * 0.05, p.sun);
    clouds(ctx, w, h, { y: h * 0.3, n: 6, color: p.cloud || p.fog, alpha: 0.35, rng });
    const n = 5;
    let yAt;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      yAt = ridge(ctx, w, h, { base: h * (0.58 + t * 0.32), amp: h * (0.26 - t * 0.08), rough: 0.55 - t * 0.15, color: mix(p.far, p.near, t), rng });
      if (p.trees && i >= n - 2) forestOn(ctx, yAt, w, { count: 40 + i * 10, size: h * (0.05 + t * 0.06), color: mix(p.far, p.near, Math.min(1, t + 0.15)), rng });
      if (i < n - 1) fog(ctx, w, h * (0.6 + t * 0.32), h * 0.06, p.fog, 0.45 - t * 0.1);
    }
  },

  castle(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    if (p.night) stars(ctx, w, h * 0.5, 200, rng);
    sun(ctx, w * p.sunX, h * p.sunY, Math.min(w, h) * 0.07, p.sun);
    rays(ctx, w * p.sunX, h * p.sunY, w, h, p.sun, rng, 9);
    clouds(ctx, w, h, { y: h * 0.38, n: 7, color: p.cloud || p.fog, alpha: 0.4, rng });
    ridge(ctx, w, h, { base: h * 0.66, amp: h * 0.2, rough: 0.55, color: mix(p.far, p.near, 0.05), rng });
    fog(ctx, w, h * 0.66, h * 0.07, p.fog, 0.5);
    const mid = ridge(ctx, w, h, { base: h * 0.76, amp: h * 0.14, rough: 0.45, color: mix(p.far, p.near, 0.4), rng });
    const cx = w * (p.castleX ?? 0.66);
    castle(ctx, cx, mid(cx) + h * 0.01, Math.min(w, h) * 0.13, mix(p.far, p.near, 0.4), p.sun);
    fog(ctx, w, h * 0.8, h * 0.06, p.fog, 0.4);
    const near = ridge(ctx, w, h, { base: h * 0.95, amp: h * 0.1, rough: 0.4, color: p.near, rng });
    forestOn(ctx, near, w, { count: 50, size: h * 0.1, color: p.near, rng });
  },

  city(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    if (p.night) stars(ctx, w, h * 0.35, 120, rng);
    glow(ctx, w * 0.5, h * 0.55, w * 0.55, p.sun, 0.35);
    if (p.moon) sun(ctx, w * 0.72, h * 0.16, Math.min(w, h) * 0.045, p.moon);
    const horizon = h * (p.road ? 0.56 : 0.72);
    skyline(ctx, w, horizon, { color: mix(p.far, p.near, 0), minH: h * 0.08, maxH: h * 0.3, rng });
    fog(ctx, w, horizon - h * 0.04, h * 0.06, p.fog, 0.5);
    skyline(ctx, w, horizon + h * 0.02, { color: mix(p.far, p.near, 0.5), window: p.windows, density: 0.18, minH: h * 0.06, maxH: h * 0.22, rng });
    skyline(ctx, w, horizon + h * 0.05, { color: p.near, window: p.windows, density: 0.3, minH: h * 0.04, maxH: h * 0.14, rng });
    ctx.fillStyle = p.near;
    ctx.fillRect(0, horizon + h * 0.05, w, h);
    if (p.road) {
      const vx = w * 0.5;
      ctx.fillStyle = mix(p.near, '#000000', 0.3);
      ctx.beginPath();
      ctx.moveTo(vx - w * 0.01, horizon + h * 0.05);
      ctx.lineTo(vx + w * 0.01, horizon + h * 0.05);
      ctx.lineTo(w * 1.1, h);
      ctx.lineTo(-w * 0.1, h);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      p.streaks.forEach((c, k) => {
        for (let i = 0; i < 6; i++) {
          const side = (k % 2 ? 1 : -1) * (0.15 + rng() * 0.75);
          ctx.strokeStyle = rgba(c, 0.25 + rng() * 0.45);
          ctx.lineWidth = (w / 800) * (1 + rng() * 2.5);
          ctx.beginPath();
          ctx.moveTo(vx + side * w * 0.01, horizon + h * 0.06);
          ctx.lineTo(vx + side * w * 0.7, h);
          ctx.stroke();
        }
      });
      ctx.restore();
      ctx.fillStyle = rgba('#ffffff', 0.5);
      for (let i = 0; i < 9; i++) {
        const t0 = Math.pow(i / 9, 2);
        const t1 = Math.pow((i + 0.5) / 9, 2);
        const y0 = horizon + h * 0.05 + (h - horizon) * t0;
        const y1 = horizon + h * 0.05 + (h - horizon) * t1;
        ctx.beginPath();
        ctx.moveTo(vx - w * 0.002 * (1 + t0 * 6), y0);
        ctx.lineTo(vx + w * 0.002 * (1 + t0 * 6), y0);
        ctx.lineTo(vx + w * 0.002 * (1 + t1 * 6), y1);
        ctx.lineTo(vx - w * 0.002 * (1 + t1 * 6), y1);
        ctx.fill();
      }
    }
    if (p.rain) {
      ctx.strokeStyle = rgba('#c8d4ff', 0.18);
      ctx.lineWidth = w / 900;
      for (let i = 0; i < 260; i++) {
        const x = rng() * w;
        const y = rng() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - w * 0.006, y + h * 0.04);
        ctx.stroke();
      }
    }
  },

  space(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    ctx.save();
    ctx.filter = `blur(${w / 18}px)`;
    p.nebula.forEach((c) => glow(ctx, rng() * w, rng() * h * 0.7, w * (0.25 + rng() * 0.25), c, 0.55));
    ctx.restore();
    stars(ctx, w, h, 420, rng);
    planet(ctx, w * p.planetX, h * p.planetY, Math.min(w, h) * p.planetR, p.planet[0], p.planet[1], p.rim);
    if (p.moonR) planet(ctx, w * 0.2, h * 0.24, Math.min(w, h) * p.moonR, '#9aa3b5', '#1b2030', p.rim);
    if (p.ships) {
      for (let i = 0; i < 7; i++) {
        const x = w * (0.15 + rng() * 0.55);
        const y = h * (0.35 + rng() * 0.25);
        const s = (w / 800) * (6 + rng() * 10);
        glow(ctx, x - s * 2.2, y, s * 2.5, p.rim, 0.5);
        ctx.fillStyle = '#0b0e16';
        ctx.beginPath();
        ctx.moveTo(x + s * 2, y);
        ctx.lineTo(x - s, y - s * 0.7);
        ctx.lineTo(x - s * 0.6, y);
        ctx.lineTo(x - s, y + s * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (p.station) {
      const cx = w * 0.62;
      const cy = h * 0.34;
      const R = Math.min(w, h) * 0.2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.35);
      ctx.strokeStyle = '#d7dee9';
      ctx.lineWidth = R * 0.11;
      ctx.beginPath();
      ctx.ellipse(0, 0, R, R * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#7f8aa0';
      ctx.lineWidth = R * 0.03;
      for (let a = 0; a < 6; a++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos((a * Math.PI) / 3) * R, Math.sin((a * Math.PI) / 3) * R * 0.32);
        ctx.stroke();
      }
      ctx.fillStyle = '#eef2f7';
      ctx.beginPath();
      ctx.ellipse(0, 0, R * 0.16, R * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.windowsColor || '#ffb35c';
      for (let a = 0; a < 24; a++) {
        const ang = (a / 24) * Math.PI * 2;
        ctx.fillRect(Math.cos(ang) * R - 1, Math.sin(ang) * R * 0.32 - 1, R * 0.03, R * 0.02);
      }
      ctx.restore();
    }
  },

  sea(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    if (p.sun) sun(ctx, w * p.sunX, h * p.sunY, Math.min(w, h) * 0.05, p.sun);
    clouds(ctx, w, h, { y: h * 0.2, n: 9, color: p.cloud, alpha: p.storm ? 0.75 : 0.35, rng, blur: 24 });
    clouds(ctx, w, h, { y: h * 0.36, n: 7, color: p.cloud, alpha: p.storm ? 0.6 : 0.25, rng, blur: 18 });
    const horizon = h * 0.6;
    if (p.island) {
      ctx.fillStyle = mix(p.far, p.near, 0.2);
      ctx.beginPath();
      ctx.ellipse(w * 0.3, horizon, w * 0.16, h * 0.07, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = mix(p.far, p.near, 0.2);
      ctx.lineWidth = w / 200;
      ctx.beginPath();
      ctx.moveTo(w * 0.33, horizon - h * 0.06);
      ctx.quadraticCurveTo(w * 0.34, horizon - h * 0.14, w * 0.36, horizon - h * 0.19);
      ctx.stroke();
      ctx.fillStyle = mix(p.far, p.near, 0.2);
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.translate(w * 0.36, horizon - h * 0.19);
        ctx.rotate(-Math.PI / 2 + (i - 2.5) * 0.55);
        ctx.beginPath();
        ctx.ellipse(w * 0.035, 0, w * 0.04, h * 0.008, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    if (p.lighthouse) {
      ctx.fillStyle = p.near;
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.5);
      ctx.lineTo(w * 0.12, h * 0.48);
      ctx.lineTo(w * 0.22, h * 0.58);
      ctx.lineTo(w * 0.3, h);
      ctx.closePath();
      ctx.fill();
      const lx = w * 0.1;
      const ly = h * 0.48;
      const lh = h * 0.2;
      ctx.fillStyle = mix(p.near, '#ffffff', 0.15);
      ctx.beginPath();
      ctx.moveTo(lx - w * 0.018, ly);
      ctx.lineTo(lx + w * 0.018, ly);
      ctx.lineTo(lx + w * 0.011, ly - lh);
      ctx.lineTo(lx - w * 0.011, ly - lh);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createLinearGradient(lx, 0, w, 0);
      bg.addColorStop(0, rgba(p.beam, 0.5));
      bg.addColorStop(1, rgba(p.beam, 0));
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(lx, ly - lh * 1.05);
      ctx.lineTo(w, ly - lh * 1.6);
      ctx.lineTo(w, ly - lh * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      glow(ctx, lx, ly - lh * 1.05, w * 0.04, p.beam, 0.9);
    }
    waves(ctx, w, h, { top: horizon, rows: 9, color: (t) => mix(p.far, p.near, t), crest: p.crest, rng });
  },

  forest(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    rays(ctx, w * p.sunX, -h * 0.05, w, h, p.sun, rng, 10);
    const n = 5;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const yAt = ridge(ctx, w, h, { base: h * (0.7 + t * 0.25), amp: h * 0.08, rough: 0.4, color: mix(p.far, p.near, t), rng });
      forestOn(ctx, yAt, w, { count: 26 + i * 6, size: h * (0.22 + t * 0.2), color: mix(p.far, p.near, t), rng });
      fog(ctx, w, h * (0.72 + t * 0.22), h * 0.08, p.fog, 0.45 - t * 0.08);
    }
  },

  lanterns(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    stars(ctx, w, h * 0.4, 120, rng);
    const water = h * 0.68;
    if (p.mountains) {
      ridge(ctx, w, h, { base: water, amp: h * 0.3, rough: 0.55, color: mix(p.far, p.near, 0.1), rng });
      fog(ctx, w, water - h * 0.04, h * 0.05, p.fog, 0.5);
    }
    ridge(ctx, w, h, { base: water, amp: h * 0.08, rough: 0.4, color: mix(p.far, p.near, 0.5), rng });
    const wg = ctx.createLinearGradient(0, water, 0, h);
    wg.addColorStop(0, p.water[0]);
    wg.addColorStop(1, p.water[1]);
    ctx.fillStyle = wg;
    ctx.fillRect(0, water, w, h - water);
    for (let i = 0; i < 70; i++) {
      const depth = rng();
      const x = rng() * w;
      const y = h * (0.08 + depth * 0.55);
      const s = (Math.min(w, h) / 80) * (0.4 + depth * 1.4);
      glow(ctx, x, y, s * 3.5, p.lantern, 0.35);
      ctx.fillStyle = mix(p.lantern, '#ffffff', 0.35);
      ctx.beginPath();
      ctx.roundRect(x - s * 0.5, y - s * 0.7, s, s * 1.4, s * 0.35);
      ctx.fill();
      const ry = water + (water - y) * 0.35;
      if (ry < h) {
        ctx.fillStyle = rgba(p.lantern, 0.25);
        ctx.fillRect(x - s * 0.5, ry, s, s * 0.3);
      }
    }
  },

  grid(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    stars(ctx, w, h * 0.45, 140, rng);
    const horizon = h * 0.6;
    glow(ctx, w * 0.5, horizon, w * 0.5, p.sun, 0.45);
    ctx.strokeStyle = rgba(p.line, 0.9);
    ctx.lineWidth = Math.max(2, w / 300);
    ctx.beginPath();
    ctx.arc(w * 0.5, horizon - h * 0.12, Math.min(w, h) * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    skyline(ctx, w, horizon, { color: p.far, window: [p.line], density: 0.1, minH: h * 0.05, maxH: h * 0.24, rng });
    ctx.fillStyle = p.near;
    ctx.fillRect(0, horizon, w, h - horizon);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(p.line, 0.55);
    ctx.lineWidth = Math.max(1, w / 700);
    for (let i = -20; i <= 20; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * w * 0.01, horizon);
      ctx.lineTo(w * 0.5 + i * w * 0.12, h);
      ctx.stroke();
    }
    for (let i = 1; i < 14; i++) {
      const y = horizon + (h - horizon) * Math.pow(i / 14, 2.2);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
    fog(ctx, w, horizon, h * 0.03, p.line, 0.35);
  },

  ash(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    sun(ctx, w * p.sunX, h * p.sunY, Math.min(w, h) * 0.08, p.sun);
    clouds(ctx, w, h, { y: h * 0.3, n: 10, color: p.cloud, alpha: 0.5, rng });
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const yAt = ridge(ctx, w, h, { base: h * (0.62 + t * 0.3), amp: h * (0.22 - t * 0.06), rough: 0.6, color: mix(p.far, p.near, t), rng });
      fog(ctx, w, h * (0.64 + t * 0.3), h * 0.06, p.fog, 0.4);
      if (i === 3) {
        ctx.strokeStyle = p.near;
        for (let k = 0; k < 6; k++) {
          const x = rng() * w;
          const y = yAt(x);
          const s = h * (0.12 + rng() * 0.12);
          ctx.lineWidth = w / 300;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + s * 0.05, y - s);
          ctx.moveTo(x + s * 0.03, y - s * 0.6);
          ctx.lineTo(x + s * 0.3, y - s * 0.85);
          ctx.moveTo(x + s * 0.04, y - s * 0.75);
          ctx.lineTo(x - s * 0.2, y - s * 1.0);
          ctx.stroke();
        }
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 90; i++) {
      const x = rng() * w;
      const y = rng() * h;
      glow(ctx, x, y, (w / 800) * (3 + rng() * 5), p.ember, 0.8);
    }
    ctx.restore();
  },

  caverns(ctx, w, h, p, rng) {
    sky(ctx, w, h, p.sky);
    glow(ctx, w * 0.5, h * 0.55, w * 0.6, p.glow, 0.35);
    ctx.save();
    ctx.translate(0, h);
    ctx.scale(1, -1);
    ridge(ctx, w, h, { base: h * 0.82, amp: h * 0.25, rough: 0.6, color: p.near, rng });
    ctx.restore();
    ridge(ctx, w, h, { base: h * 0.95, amp: h * 0.18, rough: 0.6, color: p.near, rng });
    for (let i = 0; i < 18; i++) {
      const x = rng() * w;
      const base = h * (0.82 + rng() * 0.14);
      const s = Math.min(w, h) * (0.03 + rng() * 0.08);
      const lean = (rng() - 0.5) * 0.6;
      const c = p.crystals[i % p.crystals.length];
      glow(ctx, x, base - s, s * 3, c, 0.35);
      const g = ctx.createLinearGradient(x, base - s * 3, x, base);
      g.addColorStop(0, mix(c, '#ffffff', 0.6));
      g.addColorStop(1, c);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.35, base);
      ctx.lineTo(x - s * 0.35 + lean * s, base - s * 2.2);
      ctx.lineTo(x + lean * s * 1.3, base - s * 3);
      ctx.lineTo(x + s * 0.35 + lean * s, base - s * 2.2);
      ctx.lineTo(x + s * 0.35, base);
      ctx.closePath();
      ctx.fill();
    }
  },
};

// Draw a full scene. `pixel` renders at low resolution and scales up for a retro look.
export function paintScene(canvas, spec, seed) {
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');
  const rng = rngFrom(seed);
  if (spec.pixel) {
    const small = document.createElement('canvas');
    small.width = Math.max(32, Math.round(w / spec.pixel));
    small.height = Math.max(32, Math.round(h / spec.pixel));
    const sctx = small.getContext('2d');
    SCENES[spec.scene](sctx, small.width, small.height, spec, rng);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, w, h);
    vignette(ctx, w, h, 0.35);
    return;
  }
  SCENES[spec.scene](ctx, w, h, spec, rng);
  grain(ctx, w, h, rng, 0.06);
  vignette(ctx, w, h);
}
