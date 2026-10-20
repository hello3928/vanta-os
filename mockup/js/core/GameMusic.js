// Game music, PS5 style: when a game stays selected for a moment, its official trailer fades in
// behind the hero art and its audio becomes the menu music. Moving on fades it out.
//
// One <video> element follows you between screens (attach() moves it), so opening a game's page
// keeps the same music playing without a restart. Steam serves trailers as HLS streams, so the
// mockup plays them with hls.js (or natively in Safari).
// Real OS: the same trailers through Qt Multimedia, cached by vantad, with a per-game opt-out.

const START_AT = 9; // skip rating cards and publisher logos at the start of most trailers
const SETTLE_MS = 1100; // how long a game must stay selected before its music starts
const FADE_MS = 900;

export const GameMusic = {
  enabled: true,
  showVideo: true,
  volume: 0.6,
  game: null,
  video: null,
  hls: null,
  timer: null,
  fader: null,

  ensure() {
    if (this.video) return this.video;
    const v = document.createElement('video');
    v.className = 'game-trailer';
    v.crossOrigin = 'anonymous';
    v.playsInline = true;
    v.loop = true;
    v.preload = 'none';
    v.setAttribute('aria-hidden', 'true');
    v.addEventListener('error', () => this.stop({ fade: false }));
    this.video = v;
    return v;
  },

  // Put the video into a screen's hero (before `before`, usually the shade) and select the game.
  // Screens that never attach (Library, Settings) leave the menus quiet, like the PS5.
  claimed: false,
  attach(container, g, before = null) {
    const v = this.ensure();
    container.insertBefore(v, before);
    this.claimed = true;
    this.select(g);
  },

  select(g, { now = false } = {}) {
    if (g === this.game && this.video?.classList.contains('is-playing')) return;
    clearTimeout(this.timer);
    if (g !== this.game) this.stop();
    this.game = g;
    if (!g?.trailer || (!this.enabled && !now)) return;
    this.timer = setTimeout(() => this.start(g), now ? 0 : SETTLE_MS);
  },

  get playing() {
    return !!this.video?.classList.contains('is-playing');
  },

  start(g) {
    if (g !== this.game) return;
    const v = this.ensure();
    const Hls = window.Hls;
    this.teardown();
    if (Hls?.isSupported()) {
      // Always the best stream Steam offers (1080p), never scaled down to the hero's size.
      const hls = new Hls({ startPosition: START_AT, capLevelToPlayerSize: false, maxBufferLength: 30, abrEwmaDefaultEstimate: 20e6 });
      hls.on(Hls.Events.ERROR, (_, data) => data.fatal && this.stop({ fade: false }));
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const best = data.levels.reduce((bi, l, i, all) => (l.height > all[bi].height ? i : bi), 0);
        hls.currentLevel = best;
        hls.startLevel = best;
        this.play(g);
      });
      hls.loadSource(g.trailer);
      hls.attachMedia(v);
      this.hls = hls;
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = g.trailer;
      v.addEventListener('loadedmetadata', () => (v.currentTime = START_AT), { once: true });
      this.play(g);
    }
  },

  play(g) {
    const v = this.video;
    if (g !== this.game) return;
    v.volume = 0;
    v.muted = false;
    v.play()
      .then(() => {
        if (g !== this.game) return;
        v.classList.toggle('is-visible', this.showVideo || this.expanded);
        v.classList.add('is-playing');
        this.fadeTo(this.volume);
      })
      .catch(() => {
        // Autoplay with sound refused (no press yet): play silently so the video still shows.
        v.muted = true;
        v.play().then(() => v.classList.add('is-playing', ...(this.showVideo ? ['is-visible'] : [])), () => {});
      });
  },

  stop({ fade = true } = {}) {
    clearTimeout(this.timer);
    const v = this.video;
    if (!v) return;
    v.classList.remove('is-playing', 'is-visible');
    if (!fade) return this.teardown();
    this.fadeTo(0, () => this.teardown());
  },

  teardown() {
    clearInterval(this.fader);
    this.hls?.destroy();
    this.hls = null;
    const v = this.video;
    if (!v) return;
    v.pause();
    v.removeAttribute('src');
    v.load();
  },

  // Volume ramp on a timer (not animation frames, so it also finishes in background tabs).
  fadeTo(target, done) {
    const v = this.video;
    clearInterval(this.fader);
    const from = v.volume;
    const t0 = performance.now();
    this.fader = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / FADE_MS);
      v.volume = Math.max(0, Math.min(1, from + (target - from) * p));
      if (p >= 1) {
        clearInterval(this.fader);
        done?.();
      }
    }, 30);
  },

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stop();
    else if (this.game) this.select(this.game);
  },

  setVolume(v) {
    this.volume = v;
    if (this.video?.classList.contains('is-playing')) this.fadeTo(v);
  },

  setShowVideo(on) {
    this.showVideo = on;
    this.video?.classList.toggle('is-visible', on && this.video.classList.contains('is-playing'));
  },

  // Leave the menus (a game launched, or the device went to sleep).
  release() {
    this.game = null;
    this.stop();
  },
};
