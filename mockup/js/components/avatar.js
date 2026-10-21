// Round profile picture: the profile's photo if it has one, otherwise the first letter of the
// name on the profile color. Guests get a plain person icon.

import { icon } from '../core/icons.js';
import { h } from '../core/util.js';

export function avatarEl(profile, className = 'avatar') {
  const el = h('span', className);
  if (!profile) {
    el.classList.add('avatar--guest');
    el.innerHTML = icon('user', 'avatar__icon');
    return el;
  }
  if (profile.photo) {
    const img = h('img', 'avatar__photo');
    img.alt = '';
    img.src = profile.photo;
    el.append(img);
    return el;
  }
  el.style.background = profile.color || '#4a5262';
  const letter = h('span', 'avatar__letter');
  letter.textContent = [...(profile.name || '?').trim()][0]?.toLocaleUpperCase() || '?';
  el.append(letter);
  return el;
}
