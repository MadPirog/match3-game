export class InputSystem {
  constructor(board, gameState, renderSystem) {
    this.board = board;
    this.gameState = gameState;
    this.render = renderSystem;
    this.firstTile = null;
    this.bindEvents();
  }

  bindEvents() {
    this.render.boardContainer.addEventListener('click', (e) => {
      const pos = this.render.getTileFromEvent(e);
      if (!pos) return;

      const { x, y } = pos;

      if (!this.firstTile) {
        this.firstTile = { x, y };
        this.render.highlightTile(x, y, true);
      } else {
        const secondTile = { x, y };
        if (this.firstTile.x === x && this.firstTile.y === y) {
          this.render.highlightTile(x, y, false);
          this.firstTile = null;
          return;
        }

        const tile1 = { ...this.firstTile };
        const swapped = this.board.swapTiles(tile1, secondTile);
        this.render.highlightTile(this.firstTile.x, this.firstTile.y, false);
        this.firstTile = null;

        if (swapped) {
          this.render.render();
          this.handleSwap(tile1, secondTile);
        }
      }
    });
  }

  async handleSwap(tile1, tile2) {
    this.render.boardContainer.style.pointerEvents = 'none';

    let cascadeCount = 0;
    let hasMatches = true;

    while (hasMatches) {
      const matches = this.board.findMatches();
      if (matches.length === 0) {
        hasMatches = false;
        break;
      }

      this.board.clearMatches();

      const uniqueTiles = new Set();
      for (const group of matches) {
        for (const { x, y } of group) {
          uniqueTiles.add(`${x},${y}`);
        }
      }
      this.gameState.addScore(uniqueTiles.size * 10);
      this.render.updateUI();

      this.board.applyGravity();
      this.render.render();
      this.render.updateUI();

      await new Promise((resolve) => setTimeout(resolve, 300));
      cascadeCount++;
    }

    if (cascadeCount === 0) {
      this.board.swapTiles(tile1, tile2);
      this.render.render();
    } else {
      this.gameState.useMove();
      this.render.updateUI();
    }

    this.render.boardContainer.style.pointerEvents = 'auto';

    if (this.gameState.isLevelComplete()) {
      alert(`Уровень завершен! Ваш счет: ${this.gameState.score}`);
    } else if (this.gameState.isGameOver()) {
      alert(`Игра окончена! Ваш счет: ${this.gameState.score}`);
    }
  }
}
