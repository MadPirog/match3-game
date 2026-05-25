export const TILE_TYPES = ['green', 'blue', 'red', 'yellow', 'purple'];

export const TILE_COLORS = {
  green: '#22c55e',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#eab308',
  purple: '#a855f7',
};

export function randomTileType() {
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
}
