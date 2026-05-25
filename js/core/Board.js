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
    let hasMatch;
    do {
      this.fillRandom();
      hasMatch = this.hasAnyMatch();
      if (hasMatch) {
        this.clearMatches(); // Clear any matches that occurred during fill
      }
    } while (hasMatch);
  }

  /**
   * Fill the board with random tile types.
   */
  fillRandom() {
    const types = ['apple', 'banana', 'cherry', 'grape', 'orange', 'pineapple']; // Example fruit types
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.grid[y][x]) {
          // For simplicity, we don't handle special tiles here yet.
          this.grid[y][x] = { type: types[Math.floor(Math.random() * types.length)], x, y };
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
    const visited = new Set();

    // Helper to check if a tile is part of a match and collect the group
    const getGroup = (startX, startY, dx, dy) => {
      const startTile = this.grid[startY][startX];
      if (!startTile || visited.has(`${startX},${startY}`)) return [];

      const type = startTile.type;
      const group = [{ x: startX, y: startY, tile: startTile }];
      visited.add(`${startX},${startY}`);

      let length = 1;
      // Check in positive direction
      let cx = startX + dx, cy = startY + dy;
      while (cy >= 0 && cy < this.height && cx >= 0 && cx < this.width) {
        const tile = this.grid[cy][cx];
        if (tile && tile.type === type) {
          group.push({ x: cx, y: cy, tile: tile });
          visited.add(`${cx},${cy}`);
          length++;
          cx += dx;
          cy += dy;
        } else {
          break;
        }
      }
      // Check in negative direction
      cx = startX - dx;
      cy = startY - dy;
      while (cy >= 0 && cy < this.height && cx >= 0 && cx < this.width) {
        const tile = this.grid[cy][cx];
        if (tile && tile.type === type) {
          group.push({ x: cx, y: cy, tile: tile });
          visited.add(`${cx},${cy}`);
          length++;
          cx -= dx;
          cy -= dy;
        } else {
          break;
        }
      }
      // Only return if we have at least 3 in a line
      return length >= 3 ? group : [];
    };

    // Horizontal groups
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const group = getGroup(x, y, 1, 0);
        if (group.length >= 3) {
          matches.push(group);
        }
      }
    }
    // Vertical groups
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const group = getGroup(x, y, 0, 1);
        if (group.length >= 3) {
          matches.push(group);
        }
      }
    }

    // Remove duplicate groups (same set of tiles) - simple approach: flatten and compare sets
    // For simplicity, we'll just return all and let the caller handle duplicates if needed.
    // In a real game, we might want to merge overlapping groups (like L or T shapes) for special tiles.
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
      for (const { tile } of group) {
        const { x, y } = tile;
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
        const types = ['apple', 'banana', 'cherry', 'grape', 'orange', 'pineapple'];
        this.grid[y][x] = {
          type: types[Math.floor(Math.random() * types.length)],
          x,
          y
        };
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