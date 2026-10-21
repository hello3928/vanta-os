// Profiles for "Who's playing?". Each has a name, a color and optionally a cropped photo.
// Without a photo the picture is the name's first letter on the profile color.
// Saved in this browser only (a viewer convenience). Real OS: per-user data in vantad,
// each profile with its own saves, settings and Steam sign-in.

const KEY = 'vanta.mockup.profiles.v2';

// Muted, distinct colors that keep white initials readable.
export const COLORS = ['#3d5a80', '#2f6f69', '#6b4c7a', '#8a4b33', '#5d6b3a', '#4a5262', '#7a3e52', '#2f5f8a'];

let state = { list: [], current: null };
try {
  state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || 'null') };
  if (!state.list.length) {
    // Bring over profiles from the earlier version (they used game art as pictures).
    const old = JSON.parse(localStorage.getItem('vanta.mockup.profiles.v1') || 'null');
    if (old?.list?.length) {
      state.list = old.list.map((p, i) => ({ id: p.id, name: p.name, color: COLORS[i % COLORS.length], photo: null }));
      state.current = old.current;
    }
  }
} catch {
  /* storage blocked: start empty */
}

const listeners = [];
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* photo too large for storage, or storage blocked: keep it for this session */
  }
  listeners.forEach((fn) => fn());
};

export const Profiles = {
  get list() {
    return state.list;
  },
  get current() {
    return state.list.find((p) => p.id === state.current) || null;
  },
  byId(id) {
    return state.list.find((p) => p.id === id) || null;
  },
  nextColor() {
    return COLORS[state.list.length % COLORS.length];
  },
  add({ name, color, photo = null }) {
    const p = { id: `p${Date.now().toString(36)}`, name: name.trim() || 'Player', color: color || this.nextColor(), photo };
    state.list.push(p);
    save();
    return p;
  },
  update(id, changes) {
    const p = this.byId(id);
    if (!p) return;
    Object.assign(p, changes);
    if ('name' in changes) p.name = changes.name.trim() || p.name;
    save();
  },
  remove(id) {
    state.list = state.list.filter((p) => p.id !== id);
    if (state.current === id) state.current = null;
    save();
  },
  use(id) {
    state.current = id;
    save();
  },
  guest() {
    state.current = 'guest';
    save();
  },
  isGuest() {
    return state.current === 'guest';
  },
  onChange(fn) {
    listeners.push(fn);
  },
};
