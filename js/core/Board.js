import { randomTileType } from './tiles.js';

export class Board {
  constructor(width, height, gameState) {
    this.width = width;
    this.height = height;
    this.gameState = gameState;
    this.grid = []; // 2D array of Tile objects or null for empty
    this.selectedTile = null; // Currently selected tile for swapping
  }

  /**
   * Generate a new board with random tiles, ensuring no initial matches.
   */
  generate() {
    this.grid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => null)
    );
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let type;
        do {
          type = randomTileType();
        } while (
          (x >= 2 &&
            this.grid[y][x - 1]?.type === type &&
            this.grid[y][x - 2]?.type === type) ||
          (y >= 2 &&
            this.grid[y - 1][x]?.type === type &&
            this.grid[y - 2][x]?.type === type)
        );
        this.grid[y][x] = { type, x, y };
      }
    }
  }

  /**
   * Fill the board with random tile types.
   */
  fillRandom() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.grid[y][x]) {
          this.grid[y][x] = { type: randomTileType(), x, y };
        }
      }
    }
  }

  /**
   * Check if there is any match on the board.
   * @returns {boolean} true if there is at least one match
   */
  hasAnyMatch() {
    // Check horizontal matches
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width - 2; x++) {
        const tile = this.grid[y][x];
        if (tile &&
            this.grid[y][x + 1] &&
            this.grid[y][x + 2] &&
            tile.type === this.grid[y][x + 1].type &&
            tile.type === this.grid[y][x + 2].type) {
          return true;
        }
      }
    }
    // Check vertical matches
    for (let y = 0; y < this.height - 2; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        if (tile &&
            this.grid[y + 1][x] &&
            this.grid[y + 2][x] &&
            tile.type === this.grid[y + 1][x].type &&
            tile.type === this.grid[y + 2][x].type) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Find and return all matches (groups of 3 or more) as an array of tiles.
   * @returns {Array<Array<Object>>} 2D array where each sub-array is a match group
   */
  findMatches() {
    const matches = [];

    const collectRuns = (axis) => {
      const isHorizontal = axis === 'h';
      const primary = isHorizontal ? this.height : this.width;
      const secondary = isHorizontal ? this.width : this.height;

      for (let p = 0; p < primary; p++) {
        let run = [];
        for (let s = 0; s < secondary; s++) {
          const x = isHorizontal ? s : p;
          const y = isHorizontal ? p : s;
          const tile = this.grid[y][x];

          if (tile && (run.length === 0 || run[0].tile.type === tile.type)) {
            run.push({ x, y, tile });
          } else {
            if (run.length >= 3) matches.push(run);
            run = tile ? [{ x, y, tile }] : [];
          }
        }
        if (run.length >= 3) matches.push(run);
      }
    };

    collectRuns('h');
    collectRuns('v');
    return matches;
  }

  /**
   * Clear matched tiles from the board and return them.
   * @returns {Array<Object>} Array of cleared tile objects
   */
  clearMatches() {
    const matches = this.findMatches();
    const cleared = [];
    for (const group of matches) {
      for (const { x, y } of group) {
        if (this.grid[y][x]) {
          cleared.push(this.grid[y][x]);
          this.grid[y][x] = null;
        }
      }
    }
    return cleared;
  }

  /**
   * Apply gravity: let tiles fall down to fill empty spaces.
   */
  applyGravity() {
    for (let x = 0; x < this.width; x++) {
      let writeY = this.height - 1;
      for (let y = this.height - 1; y >= 0; y--) {
        if (this.grid[y][x]) {
          if (y !== writeY) {
            this.grid[writeY][x] = this.grid[y][x];
            this.grid[writeY][x].y = writeY; // Update tile's y coordinate
            this.grid[y][x] = null;
          }
          writeY--;
        }
      }
      // Fill the top with new tiles
      for (let y = 0; y <= writeY; y++) {
        this.grid[y][x] = { type: randomTileType(), x, y };
      }
    }
  }

  /**
   * Swap two tiles if they are adjacent.
   * @param {Object} tile1 - {x, y} coordinates
   * @param {Object} tile2 - {x, y} coordinates
   * @returns {boolean} true if swap was valid and performed
   */
  swapTiles(tile1, tile2) {
    const { x: x1, y: y1 } = tile1;
    const { x: x2, y: y2 } = tile2;
    // Check if adjacent (Manhattan distance == 1)
    if (Math.abs(x1 - x2) + Math.abs(y1 - y2) !== 1) {
      return false;
    }
    // Swap in grid
    const temp = this.grid[y1][x1];
    this.grid[y1][x1] = this.grid[y2][x2];
    this.grid[y2][x2] = temp;
    // Update tile coordinates
    if (this.grid[y1][x1]) this.grid[y1][x1].x = x1;
    if (this.grid[y1][x1]) this.grid[y1][x1].y = y1;
    if (this.grid[y2][x2]) this.grid[y2][x2].x = x2;
    if (this.grid[y2][x2]) this.grid[y2][x2].y = y2;
    return true;
  }

  /**
   * Get tile at position (x, y)
   * @param {number} x
   * @param {number} y
   * @returns {Object|null} tile object or null
   */
  getTileAt(x, y) {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) return null;
    return this.grid[y][x];
  }

  /**
   * Set tile at position (x, y)
   * @param {number} x
   * @param {number} y
   * @param {Object} tile
   */
  setTileAt(x, y, tile) {
    if (y < 0 || y >= this.height || x < 0 || x >= this.width) return;
    this.grid[y][x] = tile;
    if (tile) {
      tile.x = x;
      tile.y = y;
    }
  }
}