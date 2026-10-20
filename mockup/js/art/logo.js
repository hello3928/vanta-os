// Game logo renderer. Each game has its own typeface and treatment, like real title logos.

function trackedWidth(ctx, text, tracking) {
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + tracking;
  return w - tracking;
}

function drawTracked(ctx, text, x, y, tracking, mode) {
  for (const ch of text) {
    if (mode === 'stroke') ctx.strokeText(ch, x, y);
    else ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + tracking;
  }
}

function splitLines(text, spec, lines) {
  const want = spec.lines ?? lines;
  if (want === 1 || !text.includes(' ')) return [text];
  if (want !== 2 && text.length <= 12) return [text];
  const words = text.split(' ');
  let best = [text];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

export function fontString(spec, size) {
  return `${spec.style || 'normal'} ${spec.weight || 400} ${size}px "${spec.font}"`;
}

// Draws `title` inside box {x, y, w, h}. align: 'center' | 'left'.
// `lines` is the preferred line count when the game's spec doesn't set one.
export function drawLogo(ctx, spec, title, box, align = 'center', { lines: prefer } = {}) {
  const text = spec.upper ? title.toUpperCase() : title;
  const lines = splitLines(text, spec, prefer);
  const lineH = spec.lineHeight || 1.0;
  let size = box.h / lines.length / lineH;
  ctx.font = fontString(spec, size);
  const widest = Math.max(...lines.map((l) => trackedWidth(ctx, l, (spec.tracking || 0) * size)));
  if (widest > box.w) size *= box.w / widest;
  size *= spec.scale || 1;
  // Stack lines by their measured ink bounds, so fonts with unusual metrics still fit the box.
  ctx.textBaseline = 'alphabetic';
  const measure = () => {
    ctx.font = fontString(spec, size);
    const gap = size * 0.12 * lineH;
    const metrics = lines.map((l) => {
      const m = ctx.measureText(l);
      return { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    });
    const totalH = metrics.reduce((sum, m) => sum + m.asc + m.desc, 0) + gap * (lines.length - 1);
    return { gap, metrics, totalH };
  };
  let { gap, metrics, totalH } = measure();
  if (totalH > box.h) {
    size *= box.h / totalH;
    ({ gap, metrics, totalH } = measure());
  }
  const tracking = (spec.tracking || 0) * size;
  let cursor = box.y + (box.h - totalH) / 2;

  lines.forEach((line, i) => {
    const lw = trackedWidth(ctx, line, tracking);
    const x = align === 'center' ? box.x + (box.w - lw) / 2 : box.x;
    const y = cursor + metrics[i].asc;
    cursor = y + metrics[i].desc + gap;
    ctx.save();
    if (spec.skew) {
      ctx.translate(x + lw / 2, y);
      ctx.transform(1, 0, spec.skew, 1, 0, 0);
      ctx.translate(-(x + lw / 2), -y);
    }
    // Drop shadow so the logo reads on any art
    ctx.shadowColor = 'rgb(0 0 0 / 0.55)';
    ctx.shadowBlur = size * 0.25;
    ctx.shadowOffsetY = size * 0.04;
    if (spec.glow) {
      ctx.shadowColor = spec.glow;
      ctx.shadowBlur = size * 0.45;
      ctx.shadowOffsetY = 0;
    }
    if (spec.stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * spec.stroke.w;
      ctx.strokeStyle = spec.stroke.color;
      drawTracked(ctx, line, x, y, tracking, 'stroke');
    }
    if (Array.isArray(spec.fill)) {
      const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
      spec.fill.forEach((c, k) => g.addColorStop(k / (spec.fill.length - 1), c));
      ctx.fillStyle = g;
    } else ctx.fillStyle = spec.fill || '#ffffff';
    drawTracked(ctx, line, x, y, tracking, 'fill');
    if (spec.glow) {
      ctx.shadowBlur = 0;
      drawTracked(ctx, line, x, y, tracking, 'fill');
    }
    ctx.restore();
  });
}
