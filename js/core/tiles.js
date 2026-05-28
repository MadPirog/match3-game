export const TILE_TYPES = ['green', 'blue', 'red', 'yellow', 'purple', 'orange', 'pink'];

export const TILE_COLORS = {
  green: '#22c55e',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
};

export const TILE_TEXTURES = {
  green: 'assets/rune_green_n.png',
  blue: 'assets/rune_blue_n.png',
  red: 'assets/rune_red_n.png',
  yellow: 'assets/rune_yellow_n.png',
  purple: 'assets/rune_purple_n.png',
  orange: 'assets/rune_orange_n.png',
  pink: 'assets/rune_pink_n.png',
};

export const TILE_TEXTURES_SPECIAL = {
  lightningRow: {
    green: 'assets/rune_green_h.png',
    blue: 'assets/rune_blue_h.png',
    red: 'assets/rune_red_h.png',
    yellow: 'assets/rune_yellow_h.png',
    purple: 'assets/rune_purple_h.png',
    orange: 'assets/rune_orange_h.png',
    pink: 'assets/rune_pink_h.png',
  },
  lightningCol: {
    green: 'assets/rune_green_v.png',
    blue: 'assets/rune_blue_v.png',
    red: 'assets/rune_red_v.png',
    yellow: 'assets/rune_yellow_v.png',
    purple: 'assets/rune_purple_v.png',
    orange: 'assets/rune_orange_v.png',
    pink: 'assets/rune_pink_v.png',
  },
};

export const SPECIAL_TEXTURES = {
  colorBomb: 'assets/rainbow.png',
};

export function randomTileType(numTypes = 5) {
  const count = Math.min(numTypes, TILE_TYPES.length);
  return TILE_TYPES[Math.floor(Math.random() * count)];
}
