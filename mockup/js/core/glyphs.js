// Controller and keyboard glyphs for button prompts. The style follows the controller in use:
// Xbox (colored letters), PlayStation (✕ ○ □ △ shapes), Nintendo (letters in Nintendo positions),
// Steam Deck (white letters), and keycaps for the keyboard.
// Prompts name actions, not buttons: glyph('accept') draws whatever button accepts on that pad.
// Real OS: the same art as SVG assets, chosen from SDL3's gamepad type.

const FACE_BG = '#1f252e';
const RING = 'rgb(255 255 255 / 0.28)';
const FONT = "font-family=\"Figtree, 'Segoe UI', sans-serif\" font-weight=\"700\"";

const svg = (w, body, label) => `<svg class="v-glyph" viewBox="0 0 ${w} 24" width="${w}" height="24" role="img" aria-label="${label}">${body}</svg>`;
const disc = (inner) => `<circle cx="12" cy="12" r="11" fill="${FACE_BG}" stroke="${RING}"/>${inner}`;
const letter = (ch, color, size = 12.5) => `<text x="12" y="16.4" text-anchor="middle" font-size="${size}" fill="${color}" ${FONT}>${ch}</text>`;

const PS = {
  cross: (c) => `<path d="M7.6 7.6l8.8 8.8M16.4 7.6l-8.8 8.8" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/>`,
  circle: (c) => `<circle cx="12" cy="12" r="5.2" fill="none" stroke="${c}" stroke-width="2.2"/>`,
  square: (c) => `<rect x="7.2" y="7.2" width="9.6" height="9.6" rx="0.8" fill="none" stroke="${c}" stroke-width="2.2"/>`,
  triangle: (c) => `<path d="M12 6.6l5.6 9.6H6.4z" fill="none" stroke="${c}" stroke-width="2.1" stroke-linejoin="round"/>`,
};

// South / east / west / north face buttons, per family.
const FACES = {
  xbox: { south: ['A', '#5dc95d'], east: ['B', '#f05a5a'], west: ['X', '#4f9cf2'], north: ['Y', '#f2c94c'] },
  deck: { south: ['A', '#ffffff'], east: ['B', '#ffffff'], west: ['X', '#ffffff'], north: ['Y', '#ffffff'] },
  nintendo: { south: ['B', '#ffffff'], east: ['A', '#ffffff'], west: ['Y', '#ffffff'], north: ['X', '#ffffff'] },
  ps: { south: ['cross', '#8fb3ff'], east: ['circle', '#ff6b78'], west: ['square', '#f39ad8'], north: ['triangle', '#4fd8b4'] },
};

const SHOULDERS = { xbox: ['LB', 'RB'], deck: ['L1', 'R1'], nintendo: ['L', 'R'], ps: ['L1', 'R1'] };

function face(family, pos) {
  const [name, color] = FACES[family][pos];
  return svg(24, disc(family === 'ps' ? PS[name](color) : letter(name, color)), family === 'ps' ? name : name);
}

function shoulder(text) {
  const w = text.length > 1 ? 34 : 28;
  return svg(w, `<rect x="1" y="3.5" width="${w - 2}" height="17" rx="7" fill="${FACE_BG}" stroke="${RING}"/><text x="${w / 2}" y="16" text-anchor="middle" font-size="10.5" fill="#ffffff" ${FONT}>${text}</text>`, text);
}

// Menu (≡), View (⧉), plus and minus: small round system buttons.
const SYSTEM = {
  menu: `<path d="M7.5 9h9M7.5 12h9M7.5 15h9" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>`,
  view: `<rect x="6.8" y="7.6" width="6.6" height="6.6" rx="1.2" fill="none" stroke="#fff" stroke-width="1.5"/><rect x="10.6" y="10" width="6.6" height="6.6" rx="1.2" fill="${FACE_BG}" stroke="#fff" stroke-width="1.5"/>`,
  plus: `<path d="M12 7.5v9M7.5 12h9" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  minus: `<path d="M7.5 12h9" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  dots: `<circle cx="8" cy="12" r="1.4" fill="#fff"/><circle cx="12" cy="12" r="1.4" fill="#fff"/><circle cx="16" cy="12" r="1.4" fill="#fff"/>`,
};
const SYSTEM_FOR = {
  xbox: { qam: 'menu', mainMenu: 'view' },
  ps: { qam: 'menu', mainMenu: 'view' },
  nintendo: { qam: 'plus', mainMenu: 'minus' },
  deck: { qam: 'dots', mainMenu: 'view' },
};
const system = (kind) => svg(24, disc(SYSTEM[kind]), kind);

// Keycap with a deeper bottom edge, sized to its label.
function keycap(text) {
  const w = Math.max(24, 10 + text.length * 7.2);
  return svg(
    w,
    `<rect x="1" y="2" width="${w - 2}" height="20" rx="4.5" fill="#d7dce3"/><rect x="1" y="2" width="${w - 2}" height="17.5" rx="4.5" fill="#f4f6f9"/><text x="${w / 2}" y="14.6" text-anchor="middle" font-size="10.5" fill="#1a1f27" ${FONT}>${text}</text>`,
    text,
  );
}

const KEYS = { accept: 'Enter', back: 'Esc', options: 'X', qam: 'Q', mainMenu: 'M', prevTab: '[', nextTab: ']', power: 'P', up: '↑' };

// D-pad with the up arm lit.
const DPAD_UP = svg(24, `<path d="M9 2.5h6v6.5h6.5v6H15v6.5H9V15H2.5V9H9z" fill="${FACE_BG}" stroke="${RING}"/><path d="M9.8 3.3h4.4V9H9.8z" fill="#ffffff"/>`, 'up');

// Works out the controller family from the Gamepad API id (vendor IDs: 054c Sony, 057e Nintendo, 28de Valve).
export function familyFromId(id = '') {
  const s = id.toLowerCase();
  if (/054c|playstation|dualsense|dualshock|wireless controller/.test(s)) return 'ps';
  if (/057e|nintendo|pro controller|joy-con/.test(s)) return 'nintendo';
  if (/28de|steam deck|valve|steam controller/.test(s)) return 'deck';
  return 'xbox';
}

// device: 'gamepad' | 'keyboard' | 'pointer' | 'touch'. Pointer and touch show keyboard keys.
export function glyph(action, device = 'keyboard', family = 'xbox') {
  if (device !== 'gamepad') {
    if (action === 'tabs') return keycap('[') + keycap(']');
    return keycap(KEYS[action] || action);
  }
  switch (action) {
    case 'accept':
      return face(family, 'south');
    case 'back':
      return face(family, 'east');
    case 'options':
      return face(family, 'west');
    case 'prevTab':
      return shoulder(SHOULDERS[family][0]);
    case 'nextTab':
      return shoulder(SHOULDERS[family][1]);
    case 'tabs':
      return shoulder(SHOULDERS[family][0]) + shoulder(SHOULDERS[family][1]);
    case 'up':
      return DPAD_UP;
    case 'qam':
    case 'mainMenu':
      return system(SYSTEM_FOR[family][action]);
    default:
      return keycap(action);
  }
}
