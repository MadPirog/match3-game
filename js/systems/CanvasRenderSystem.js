import { TILE_COLORS } from '../core/tiles.js';

export class CanvasRenderSystem {
  constructor(board) {
    this.board = board;
    this.container = document.getElementById('game-container');
    this.tileSize = 60; // Размер плитки в пикселях
    this.initCanvas();
    this.initUI();
  }

  initCanvas() {
    // Создаем canvas элемент
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Устанавливаем размеры canvas
    this.resizeCanvas();
    
    this.container.appendChild(this.canvas);
    this.boardContainer = this.canvas;

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
  }

  resizeCanvas() {
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    
    // Вычисляем оптимальный размер доски с учетом отступов
    const boardWidth = this.board.width * this.tileSize;
    const boardHeight = this.board.height * this.tileSize;
    
    // Центрируем доску в контейнере
    this.canvas.width = Math.min(boardWidth, containerWidth - 40);
    this.canvas.height = Math.min(boardHeight, containerHeight - 100);
    
    // Пересчитываем реальный размер плитки с учетом масштабирования
    this.tileSize = Math.min(
      this.canvas.width / this.board.width,
      this.canvas.height / this.board.height
    );
    
    // Центрируем доску в канвасе
    this.offsetX = (this.canvas.width - this.board.width * this.tileSize) / 2;
    this.offsetY = (this.canvas.height - this.board.height * this.tileSize) / 2;
  }

  initUI() {
    // Создаем UI панель под канвасом
    this.uiPanel = document.createElement('div');
    this.uiPanel.className = 'ui-panel';
    this.uiPanel.innerHTML = `
      <div>Score: <span id="score">0</span></div>
      <div>Moves: <span id="moves">30</span></div>
      <div><button id="restart-btn" class="button">Restart</button></div>
    `;
    this.container.appendChild(this.uiPanel);

    // Привязываем обработчик перезапуска
    document.getElementById('restart-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }

  /**
   * Рендеринг игрового доски на canvas
   */
  render() {
    // Очищаем canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Рисуем фон (опционально)
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Рисуем сетку доски (отладочная опция)
    // this.drawGrid();
    
    // Рисуем все плитки
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        const tile = this.board.getTileAt(x, y);
        if (tile) {
          this.drawTile(x, y, tile.type);
        }
      }
    }
  }

  /**
   * Рисует отдельную плитку
   * @param {number} x - координата по x на доске
   * @param {number} y - координата по y на доске
   * @param {string} type - тип плитки (определяет цвет)
   */
  drawTile(x, y, type) {
    // Вычисляем позицию на canvas
    const screenX = this.offsetX + x * this.tileSize;
    const screenY = this.offsetY + y * this.tileSize;
    
    const color = TILE_COLORS[type] || '#808080';
    
    // Рисуем плитку
    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
    
    // Добавляем легкую тень для объема
    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
    
    // Добавляем блик сверху для объема
    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize * 0.3);
  }

  /**
   * Рисует сетку доски (для отладки)
   */
  drawGrid() {
    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 0.5;
    
    // Вертикальные линии
    for (let x = 0; x <= this.board.width; x++) {
      const posX = this.offsetX + x * this.tileSize;
      this.ctx.beginPath();
      this.ctx.moveTo(posX, this.offsetY);
      this.ctx.lineTo(posX, this.offsetY + this.board.height * this.tileSize);
      this.ctx.stroke();
    }
    
    // Горизонтальные линии
    for (let y = 0; y <= this.board.height; y++) {
      const posY = this.offsetY + y * this.tileSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, posY);
      this.ctx.lineTo(this.offsetX + this.board.width * this.tileSize, posY);
      this.ctx.stroke();
    }
  }

  /**
   * Обновление UI счета и ходов
   */
  updateUI() {
    document.getElementById('score').textContent = this.board.gameState.score;
    document.getElementById('moves').textContent = this.board.gameState.movesLeft;
  }

  /**
   * Подсветка выбранной плитки (для визуальной обратной связи)
   * @param {number} x
   * @param {number} y
   * @param {boolean} highlight
   */
  getTileFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const x = Math.floor((canvasX - this.offsetX) / this.tileSize);
    const y = Math.floor((canvasY - this.offsetY) / this.tileSize);

    if (x < 0 || x >= this.board.width || y < 0 || y >= this.board.height) {
      return null;
    }
    if (!this.board.getTileAt(x, y)) return null;
    return { x, y };
  }

  highlightTile(x, y, highlight) {
    // Для canvas-рендерера мы будем рисовать контур вокруг плитки
    // Это можно реализовать, перерисовывая плитку с эффектом выделения
    // Для простоты мы просто перерисовываем всю доску при смене выделения
    // В реальной игре можно оптимизировать, перерисовывая только измененные плитки
    this.render();
    
    if (highlight) {
      const screenX = this.offsetX + x * this.tileSize;
      const screenY = this.offsetY + y * this.tileSize;
      
      this.ctx.strokeStyle = '#00ff00'; // Зеленый контур для выделения
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
    }
  }
}