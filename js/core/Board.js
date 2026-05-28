import { randomTileType } from './tiles.js';

export class Board {
  constructor(width, height, gameState) {
    this.width = width;
    this.height = height;
    this.gameState = gameState;
    this.grid = []; // 2D array of Tile objects or null for empty
    this.selectedTile = null; // Currently selected tile for swapping
  }

  createTile(type, x, y, extra = null) {
    const now = Date.now();
    return {
      type,
      x,
      y,
      spawnedAt: now,
      ...(extra ?? {}),
    };
  }

  /**
   * Generate a new board with random tiles, ensuring no initial matches.
   */
  generate(numTileTypes) {
    const numTypes = numTileTypes ?? this.gameState?.numTileTypes ?? 5;
    this.grid = Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => null)
    );
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let type;
        do {
          type = randomTileType(numTypes);
        } while (
          (x >= 2 &&
            this.grid[y][x - 1]?.type === type &&
            this.grid[y][x - 2]?.type === type) ||
          (y >= 2 &&
            this.grid[y - 1][x]?.type === type &&
            this.grid[y - 2][x]?.type === type)
        );
        this.grid[y][x] = this.createTile(type, x, y);
      }
    }
  }

  /**
   * Fill the board with random tile types.
   */
  fillRandom(numTileTypes) {
    const numTypes = numTileTypes ?? this.gameState?.numTileTypes ?? 5;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.grid[y][x]) {
          this.grid[y][x] = this.createTile(randomTileType(numTypes), x, y);
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

  coordsInGroup(group, coords) {
    return group.some(({ x, y }) => x === coords.x && y === coords.y);
  }

  selectSpecialSpawn(group, swapContext) {
    if (swapContext?.tile2 && this.coordsInGroup(group, swapContext.tile2)) {
      return { x: swapContext.tile2.x, y: swapContext.tile2.y };
    }
    if (swapContext?.tile1 && this.coordsInGroup(group, swapContext.tile1)) {
      return { x: swapContext.tile1.x, y: swapContext.tile1.y };
    }
    const center = group[Math.floor(group.length / 2)];
    return { x: center.x, y: center.y };
  }

  resolveMatches(swapContext = null) {
    const matches = this.findMatches();
    if (matches.length === 0) {
      return { matches, clearedTiles: [] };
    }

    const specialSpawns = new Map();
    const protectedPositions = new Set();

    for (const group of matches) {
      if (group.length < 4) continue;

      const spawnPos = this.selectSpecialSpawn(group, swapContext);
      const key = `${spawnPos.x},${spawnPos.y}`;

      let special;
      if (group.length >= 5) {
        special = 'colorBomb';
      } else {
        // 4-в-ряд: определяем направление (горизонталь / вертикаль)
        const g0 = group[0];
        const g1 = group[1] ?? g0;
        if (g0.y === g1.y) {
          special = 'lightningRow'; // горизонтальная молния
        } else {
          special = 'lightningCol'; // вертикальная молния
        }
      }

      const existing = specialSpawns.get(key);
      if (!existing || (existing.special !== 'colorBomb' && special === 'colorBomb')) {
        specialSpawns.set(key, { x: spawnPos.x, y: spawnPos.y, type: group[0].tile.type, special });
      }
      protectedPositions.add(key);
    }

    const clearedByKey = new Map();
    const lightningRowExpansions = [];
    const lightningColExpansions = [];

    const clearAt = (x, y) => {
      const key = `${x},${y}`;
      if (protectedPositions.has(key)) return;
      const tile = this.grid[y][x];
      if (!tile || clearedByKey.has(key)) return;
      clearedByKey.set(key, tile);
      this.grid[y][x] = null;
      if (tile.special === 'lightningRow') {
        lightningRowExpansions.push({ x, y });
      } else if (tile.special === 'lightningCol') {
        lightningColExpansions.push({ x, y });
      }
    };

    for (const group of matches) {
      for (const { x, y } of group) {
        clearAt(x, y);
      }
    }

    for (const lightning of lightningRowExpansions) {
      for (let cx = 0; cx < this.width; cx++) clearAt(cx, lightning.y);
    }
    for (const lightning of lightningColExpansions) {
      for (let cy = 0; cy < this.height; cy++) clearAt(lightning.x, cy);
    }

    for (const spawn of specialSpawns.values()) {
      const tile = this.grid[spawn.y][spawn.x];
      if (tile) {
        tile.special = spawn.special;
        tile.type = spawn.type;
        tile.spawnedAt = Date.now();
      } else {
        this.grid[spawn.y][spawn.x] = this.createTile(spawn.type, spawn.x, spawn.y, {
          special: spawn.special,
        });
      }
    }

    return { matches, clearedTiles: [...clearedByKey.values()] };
  }

  activateColorBombSwap(tile1, tile2) {
    const first = this.getTileAt(tile1.x, tile1.y);
    const second = this.getTileAt(tile2.x, tile2.y);
    if (!first || !second) return [];

    const firstIsBomb = first.special === 'colorBomb';
    const secondIsBomb = second.special === 'colorBomb';
    if (!firstIsBomb && !secondIsBomb) return [];

    const clearedByKey = new Map();
    const clearAt = (x, y) => {
      const key = `${x},${y}`;
      const tile = this.grid[y][x];
      if (!tile || clearedByKey.has(key)) return;
      clearedByKey.set(key, tile);
      this.grid[y][x] = null;
    };

    if (firstIsBomb && secondIsBomb) {
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          clearAt(x, y);
        }
      }
      return [...clearedByKey.values()];
    }

    const targetType = firstIsBomb ? second.type : first.type;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.grid[y][x];
        if (tile && (tile.type === targetType || tile.special === 'colorBomb')) {
          clearAt(x, y);
        }
      }
    }

    return [...clearedByKey.values()];
  }

  /**
   * Clear matched tiles from the board and return them.
   * @returns {Array<Object>} Array of cleared tile objects
   */
  clearMatches() {
    const { clearedTiles } = this.resolveMatches();
    return clearedTiles;
  }

  /**
   * Apply gravity: let tiles fall down to fill empty spaces.
   * @returns {{ movements: Array, spawns: Array }}
   */
  applyGravity() {
    const movements = [];
    const spawns = [];

    for (let x = 0; x < this.width; x++) {
      let writeY = this.height - 1;
      for (let y = this.height - 1; y >= 0; y--) {
        if (this.grid[y][x]) {
          if (y !== writeY) {
            movements.push({
              tile: this.grid[y][x],
              fromX: this.grid[y][x].x,
              fromY: this.grid[y][x].y,
              toX: x,
              toY: writeY,
            });
            this.grid[writeY][x] = this.grid[y][x];
            this.grid[writeY][x].y = writeY;
            this.grid[y][x] = null;
          }
          writeY--;
        }
      }
      for (let y = 0; y <= writeY; y++) {
        const numTypes = this.gameState?.numTileTypes ?? 5;
        const tile = this.createTile(randomTileType(numTypes), x, y);
        this.grid[y][x] = tile;
        spawns.push({ tile, x, y });
      }
    }

    return { movements, spawns };
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