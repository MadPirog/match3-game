export class InputSystem {
  constructor(board, gameState, renderSystem) {
    this.board = board;
    this.gameState = gameState;
    this.render = renderSystem;
    this.firstTile = null;
    this.bindEvents();
  }

  bindEvents() {
    this._dragState = null;

    const onPointerDown = (e) => {
      if (this._processing) return;
      const pos = this.render.getTileFromEvent(e);
      if (!pos) return;
      if (!this.board.getTileAt(pos.x, pos.y)) return;

      this._dragState = {
        startTile: { x: pos.x, y: pos.y },
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
      };
    };

    const onPointerMove = (e) => {
      if (!this._dragState || this._processing) return;
      e.preventDefault();

      const { startX, startY, isDragging, startTile } = this._dragState;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 15) {
        if (!isDragging) {
          this._dragState.isDragging = true;
          // Снимаем выделение, если было
          if (this.firstTile) {
            this.render.highlightTile(this.firstTile.x, this.firstTile.y, false);
            this.firstTile = null;
          }
          // Запоминаем смещение от курсора до плитки (один раз при старте)
          const tile = this.board.getTileAt(startTile.x, startTile.y);
          if (tile) {
            this.render.setDrag(tile, e.clientX, e.clientY);
          }
        }

        const tile = this.board.getTileAt(startTile.x, startTile.y);
        if (tile) {
          this.render.updateDrag(e.clientX, e.clientY);

          const dropPos = this.render.getTileFromEvent(e);
          if (dropPos) {
            const isAdjacent = Math.abs(dropPos.x - startTile.x) + Math.abs(dropPos.y - startTile.y) === 1;
            if (isAdjacent) {
              this.render.setDropTarget(dropPos.x, dropPos.y);
            } else {
              this.render.setDropTarget(null, null);
            }
          } else {
            this.render.setDropTarget(null, null);
          }

          this.render.render();
        }
      }
    };

    const onPointerUp = async (e) => {
      if (!this._dragState || this._processing) return;

      if (this._dragState.isDragging) {
        this.render.clearDrag();
        this.render.setDropTarget(null, null);

        const dropPos = this.render.getTileFromEvent(e);
        if (dropPos) {
          const tile1 = { ...this._dragState.startTile };
          const tile2 = { ...dropPos };

          if (!(tile1.x === tile2.x && tile1.y === tile2.y)) {
            const isAdjacent = Math.abs(tile1.x - tile2.x) + Math.abs(tile1.y - tile2.y) === 1;
            if (isAdjacent) {
              const swapped = this.board.swapTiles(tile1, tile2);
              if (swapped) {
                await this.render.animateSwap(tile1, tile2, false);
                await this.handleSwap(tile1, tile2);
                this._dragState = null;
                return;
              }
            }
          }
        }

        // Сброс — невалидный обмен
        this.render.render();
      } else {
        // Клик без перетаскивания — старое поведение
        this.render.setDropTarget(null, null);
        const pos = this.render.getTileFromEvent(e);
        if (pos) {
          const { x, y } = pos;

          if (!this.firstTile) {
            this.firstTile = { x, y };
            this.render.highlightTile(x, y, true);
          } else {
            const secondTile = { x, y };
            if (this.firstTile.x === x && this.firstTile.y === y) {
              this.render.highlightTile(x, y, false);
              this.firstTile = null;
              this._dragState = null;
              return;
            }

            const tile1 = { ...this.firstTile };
            const swapped = this.board.swapTiles(tile1, secondTile);
            this.render.highlightTile(this.firstTile.x, this.firstTile.y, false);
            this.firstTile = null;

            if (swapped) {
              await this.render.animateSwap(tile1, secondTile, false);
              await this.handleSwap(tile1, secondTile);
            }
          }
        }
      }

      this._dragState = null;
    };

    this.render.boardContainer.addEventListener('pointerdown', onPointerDown);
    this.render.boardContainer.addEventListener('pointermove', onPointerMove);
    this.render.boardContainer.addEventListener('pointerup', onPointerUp);
    this.render.boardContainer.addEventListener('pointerleave', onPointerUp);

    // Запрещаем контекстное меню на канвасе
    this.render.boardContainer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  async handleSwap(tile1, tile2) {
    this._processing = true;
    this.render.boardContainer.style.pointerEvents = 'none';

    let cascadeCount = 0;
    let hasMatches = true;

    const colorBombCleared = this.board.activateColorBombSwap(tile1, tile2);
    if (colorBombCleared.length > 0) {
      this.gameState.addScore(colorBombCleared.length * 10);
      this.render.updateUI();
      await this.render.animateExplosion(colorBombCleared);
      const grav = this.board.applyGravity();
      await this.render.animateGravity(grav);
      await new Promise((resolve) => setTimeout(resolve, 80));
      cascadeCount++;
    }

    while (hasMatches) {
      const { matches, clearedTiles } = this.board.resolveMatches({ tile1, tile2 });
      if (matches.length === 0 || clearedTiles.length === 0) {
        hasMatches = false;
        break;
      }

      this.gameState.addScore(clearedTiles.length * 10);
      this.render.updateUI();

      await this.render.animateExplosion(clearedTiles);
      const grav = this.board.applyGravity();
      this.render.updateUI();
      await this.render.animateGravity(grav);
      await new Promise((resolve) => setTimeout(resolve, 80));
      cascadeCount++;
    }

    if (cascadeCount === 0) {
      await this.render.animateSwap(tile1, tile2, true);
      this.board.swapTiles(tile1, tile2);
      this.render.render();
    } else {
      this.gameState.useMove();
      this.render.updateUI();
    }

    this._processing = false;
    this.render.boardContainer.style.pointerEvents = 'auto';

    if (this.gameState.isLevelComplete()) {
      if (this.onLevelComplete) this.onLevelComplete();
    } else if (this.gameState.isGameOver()) {
      if (this.onGameOver) this.onGameOver();
    }
  }
}
