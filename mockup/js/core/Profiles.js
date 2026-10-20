// Profiles for "Who's playing?". Each has a name and a picture cropped from a game's art.
// Saved in this browser only (a viewer convenience). Real OS: per-user data in vantad,
// each profile with its own saves, settings and Steam sign-in.

const KEY = 'vanta.mockup.profiles.v1';

let state = { list: [], current: null };
try {
  state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {
  /* storage blocked: start empty */
}

const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

export const Profiles = {
  get list() {
    return state.list;
  },
  get current() {
    return state.list.find((p) => p.id === state.current) || null;
  },
  add({ name, avatar }) {
    const p = { id: `p${Date.now().toString(36)}`, name: name.trim() || 'Player', avatar };
    state.list.push(p);
    save();
    return p;
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
};

// Avatar choices: game art people recognise, cropped to a circle.
export const AVATARS = ['hollow-knight', 'celeste', 'elden-ring', 'hades-2', 'balatro', 'stardew', 'cyberpunk', 'bg3', 'portal-2', 'witcher-3'];
