// Round profile picture cropped from a game's capsule art, or a person icon for guests.

import { icon } from '../core/icons.js';
import { h } from '../core/util.js';
import { gameById } from '../data.js';
import { artImg } from '../art/index.js';

export function avatarEl(profile, className = 'avatar') {
  const el = h('span', className);
  if (profile?.avatar) el.append(artImg(gameById(profile.avatar), 'capsule', 'avatar__img'));
  else el.innerHTML = icon('user', 'avatar__icon');
  return el;
}
