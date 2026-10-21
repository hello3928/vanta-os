// Custom profile photo: pick an image, then position it inside a round mask.
// Drag to move, scroll wheel / pinch / the zoom slider to zoom. With a controller, the D-pad moves
// the photo while the stage is selected, and the slider zooms.
// Resolves to a 320×320 JPEG data URL, or null if cancelled.

import { VComponent } from '../core/VComponent.js';
import { VSlider } from '../components/VSlider.js';
import { VButton } from '../components/VButton.js';
import { VHintBar } from '../components/VHintBar.js';
import { FocusManager } from '../core/FocusManager.js';
import { Overlays } from '../core/Overlays.js';
import { Motion } from '../core/motion.js';
import { Sound } from '../core/Sound.js';
import { t } from '../core/i18n.js';
import { esc, h } from '../core/util.js';

const OUT = 320;

// Opens the system file picker. Resolves to a File, or null if nothing was chosen.
export function pickPhoto() {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    input.addEventListener('change', () => resolve(input.files?.[0] || null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

class CropStage extends VComponent {
  constructor(crop) {
    super({ className: 'crop__stage', focusable: true, label: t('cropTitle'), focusSound: 'move', activateSound: null, activateHaptic: null });
    this.crop = crop;
  }
  handleDirection(dir) {
    const step = 14;
    const d = { left: [-step, 0], right: [step, 0], up: [0, -step], down: [0, step] }[dir];
    // Down past the bottom edge of the photo leaves the stage for the slider.
    if (dir === 'down' && this.crop.atEdge('down')) return false;
    this.crop.pan(d[0], d[1]);
    return true;
  }
  activate() {}
}

export async function cropPhoto(file) {
  let img;
  try {
    img = await loadImage(file);
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const el = h('div', 'crop');
    const box = h('div', 'crop__box');
    const head = h('div', 'crop__head', `<h2 class="crop__title">${esc(t('cropTitle'))}</h2><p class="crop__hint">${esc(t('cropHint'))}</p>`);
    const canvas = h('canvas', 'crop__canvas');
    const stage = new CropStage(null);
    stage.el.append(canvas);
    const zoom = new VSlider({ label: t('zoom'), icon: 'zoom_in', min: 100, max: 400, step: 10, value: 100, format: (v) => `${v}%` });
    const actions = h('div', 'crop__actions');
    actions.dataset.focusGroup = '';
    const cancel = new VButton({ label: t('cancel'), variant: 'secondary' });
    const use = new VButton({ label: t('usePhoto'), variant: 'primary' });
    actions.append(cancel.el, use.el);
    const controls = h('div', 'crop__controls');
    controls.append(zoom.el);
    box.append(head, stage.el, controls, actions);
    el.append(box, new VHintBar({ hints: [['accept', t('select')], ['back', t('cancel')]] }).el);

    // ---- geometry: everything in CSS pixels, image offset measured from the stage centre ----
    const S = Math.round(Math.min(innerHeight * 0.48, innerWidth * 0.8, 420));
    const D = S * 0.84; // circle diameter
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(S * dpr);
    canvas.style.width = canvas.style.height = `${S}px`;
    const ctx = canvas.getContext('2d');
    const base = D / Math.min(img.width, img.height);
    let z = 1;
    let ox = 0;
    let oy = 0;

    const scale = () => base * z;
    const clamp = () => {
      const mx = Math.max(0, (img.width * scale()) / 2 - D / 2);
      const my = Math.max(0, (img.height * scale()) / 2 - D / 2);
      ox = Math.max(-mx, Math.min(mx, ox));
      oy = Math.max(-my, Math.min(my, oy));
    };
    const draw = () => {
      clamp();
      const s = scale();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, S, S);
      ctx.drawImage(img, S / 2 + ox - (img.width * s) / 2, S / 2 + oy - (img.height * s) / 2, img.width * s, img.height * s);
      ctx.fillStyle = 'rgb(8 10 14 / 0.66)';
      ctx.beginPath();
      ctx.rect(0, 0, S, S);
      ctx.arc(S / 2, S / 2, D / 2, 0, Math.PI * 2, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = 'rgb(255 255 255 / 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, D / 2, 0, Math.PI * 2);
      ctx.stroke();
    };
    const setZoom = (next, sync = true) => {
      z = Math.max(1, Math.min(4, next));
      if (sync) zoom.render(Math.round(z * 10) * 10);
      draw();
    };
    stage.crop = {
      pan: (dx, dy) => {
        ox += dx;
        oy += dy;
        draw();
      },
      atEdge: (dir) => dir === 'down' && oy >= Math.max(0, (img.height * scale()) / 2 - D / 2) - 0.5,
    };
    zoom.on('change', (v) => setZoom(v / 100, false));

    // Mouse and touch: drag to move, wheel or pinch to zoom.
    const pointers = new Map();
    let pinch = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    });
    canvas.addEventListener('pointermove', (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) setZoom(z * (dist / pinch));
        pinch = dist;
        return;
      }
      ox += e.clientX - prev.x;
      oy += e.clientY - prev.y;
      draw();
    });
    const lift = (e) => {
      pointers.delete(e.pointerId);
      pinch = null;
    };
    canvas.addEventListener('pointerup', lift);
    canvas.addEventListener('pointercancel', lift);
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        setZoom(z * Math.pow(1.0015, -e.deltaY));
      },
      { passive: false },
    );

    const view = {
      el,
      close({ silent = false } = {}) {
        if (view.closed) return;
        view.closed = true;
        Overlays.remove(view);
        FocusManager.popScope(el);
        if (!silent) Sound.play('close');
        Motion.play(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
        setTimeout(() => el.remove(), 210);
        URL.revokeObjectURL(img.src);
        resolve(view.result ?? null);
      },
    };
    cancel.on('activate', () => view.close());
    use.on('activate', () => {
      const out = Object.assign(document.createElement('canvas'), { width: OUT, height: OUT });
      const k = OUT / D;
      const s = scale() * k;
      out.getContext('2d').drawImage(img, OUT / 2 + ox * k - (img.width * s) / 2, OUT / 2 + oy * k - (img.height * s) / 2, img.width * s, img.height * s);
      view.result = out.toDataURL('image/jpeg', 0.86);
      view.close({ silent: true });
    });

    Overlays.root.append(el);
    Overlays.open.push(view);
    draw();
    Motion.play(box, [{ opacity: 0, transform: 'scale(0.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: Motion.out });
    FocusManager.pushScope(el, { onBack: () => view.close({ silent: true }), initial: stage });
  });
}
