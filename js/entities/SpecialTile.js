// Placeholder for special tile logic (bomb, line, color bomb)
// We'll extend the tile object with special properties later.
export class SpecialTile {
  // For now, we'll handle special tiles by modifying the tile object in Board.js
  // This file can be used to define special tile types and their effects.
  static createBomb() {
    return { special: 'bomb' };
  }
  static createLine() {
    return { special: 'line' };
  }
  static createColorBomb() {
    return { special: 'colorBomb' };
  }
}