export class RenderSystem {
  constructor(board) {
    this.board = board;
    this.container = document.getElementById('game-container');
    this.uiPanel = null;
    this.initUI();
  }

  initUI() {
    // Create UI panel
    this.uiPanel = document.createElement('div');
    this.uiPanel.className = 'ui-panel';
    this.uiPanel.innerHTML = `
      <div>Score: <span id="score">0</span></div>
      <div>Moves: <span id="moves">30</span></div>
      <div><button id="restart-btn" class="button">Restart</button></div>
    `;
    this.container.appendChild(this.uiPanel);

    // Create board container
    this.boardContainer = document.createElement('div');
    this.boardContainer.className = 'board';
    this.container.appendChild(this.boardContainer);

    // Bind restart button
    document.getElementById('restart-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }

  /**
   * Render the board: create tile elements if needed, update their appearance.
   */
  render() {
    // Clear previous tile elements (we'll re-create all for simplicity)
    this.boardContainer.innerHTML = '';

    // Create tile elements
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        const tile = this.board.getTileAt(x, y);
        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        // Set position using grid layout (we'll use inline grid style)
        // Instead, we'll set the order via CSS grid by setting row and column via style?
        // Simpler: we rely on the order of appending. Since we loop y then x, and we set the grid to have width columns,
        // the natural order will place them correctly.
        // However, we need to set the grid-template-columns on the board container.
        // We'll set that once in initUI or here.
        if (y === 0) {
          // Only set column count once
          this.boardContainer.style.gridTemplateColumns = `repeat(${this.board.width}, 60px)`;
        }

        // Set background color based on tile type (for now)
        const colorMap = {
          apple: '#ff0000',
          banana: '#ffff00',
          cherry: '#ff4500',
          grape: '#800080',
          orange: '#ffa500',
          pineapple: '#ffd700'
        };
        tileEl.style.backgroundColor = colorMap[tile.type] || '#gray';

        // Store coordinates for input handling
        tileEl.dataset.x = x;
        tileEl.dataset.y = y;

        this.boardContainer.appendChild(tileEl);
      }
    }
  }

  /**
   * Update the UI score and moves.
   */
  updateUI() {
    document.getElementById('score').textContent = this.board.gameState.score;
    document.getElementById('moves').textContent = this.board.gameState.movesLeft;
  }

  /**
   * Highlight a tile (for selection)
   * @param {number} x
   * @param {number} y
   * @param {boolean} highlight
   */
  highlightTile(x, y, highlight) {
    // Find the tile element at (x,y)
    const tiles = this.boardContainer.querySelectorAll('.tile');
    for (const tileEl of tiles) {
      const tx = parseInt(tileEl.dataset.x);
      const ty = parseInt(tileEl.dataset.y);
      if (tx === x && ty === y) {
        if (highlight) {
          tileEl.classList.add('selected');
        } else {
          tileEl.classList.remove('selected');
        }
        break;
      }
    }
  }

  /**
   * Animate a swap (optional, for now just re-render)
   */
  async animateSwap(tile1, tile2) {
    // For simplicity, we'll just re-render after a short delay to simulate swap.
    // In a more polished version, we would animate the tiles moving.
    this.render();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Animate a match (remove tiles with a pop effect)
   */
  animateMatch(matchedTiles) {
    // We'll add a 'matched' class to the tiles that are matched, which triggers an animation.
    // Note: In our current render, we re-create all tiles each frame, so we need to set the class during creation.
    // We'll modify the render method to add the class if the tile is in matchedTiles.
    // For now, we'll just re-render and let the matched class be added in the next render.
    // We'll need to pass matchedTiles to render, but let's keep it simple and just re-render without animation for now.
    // We'll improve later.
    this.render();
  }
}