import { SPECIAL_TEXTURES, TILE_COLORS, TILE_TEXTURES, TILE_TEXTURES_SPECIAL } from '../core/tiles.js';

export class CanvasRenderSystem {
  constructor(board) {
    this.board = board;
    this.container = document.getElementById('game-container');
    this.tileSize = 72; // Размер плитки в пикселях
    this.cellGap = 4; // Расстояние между клетками
    this.initCanvas();
    this.initUI();
    this.resizeCanvas();
    this._matchSound = new Audio('sounds/kakaist-glass-break-316720.mp3');
    this._matchSound.volume = 0.4;
  }

  ensureAnimationLoop() {
    if (this._animating) return;
    this._animating = true;

    const tick = () => {
      this.render();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  initCanvas() {
    // Создаем canvas элемент
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.container.appendChild(this.canvas);
    this.boardContainer = this.canvas;

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });

    this._overlay = null;
    // Состояние перетаскивания
    this.dragState = null;
    this.dropTarget = null;
    // Состояние анимации обмена
    this._swapAnim = null;
    // Состояние анимации падения
    this._gravityAnim = null;
    // Состояние анимации взрыва
    this._explosionAnim = null;
    this._explosionProgress = 0;
    this._explosionParticles = [];
  }

  resizeCanvas() {
    const uiPanel = this.uiPanel;
    const uiHeight = uiPanel ? uiPanel.offsetHeight : 0;

    // Доступное пространство с небольшими отступами
    const availW = Math.max(200, this.container.clientWidth - 12);
    const availH = Math.max(200, this.container.clientHeight - uiHeight - 8);

    this.canvas.width = availW;
    this.canvas.height = availH;

    // Пересчитываем tileSize, чтобы доска вписалась в canvas
    const maxTileW = (this.canvas.width - (this.board.width - 1) * this.cellGap) / this.board.width;
    const maxTileH = (this.canvas.height - (this.board.height - 1) * this.cellGap) / this.board.height;
    this.tileSize = Math.max(20, Math.min(maxTileW, maxTileH, 100));

    // Центрируем доску в канвасе
    const boardPixelW = this.board.width * this.tileSize + (this.board.width - 1) * this.cellGap;
    const boardPixelH = this.board.height * this.tileSize + (this.board.height - 1) * this.cellGap;
    this.offsetX = Math.max(0, (this.canvas.width - boardPixelW) / 2);
    this.offsetY = Math.max(0, (this.canvas.height - boardPixelH) / 2);
  }

  initUI() {
    // Создаем UI панель над канвасом
    this.uiPanel = document.createElement('div');
    this.uiPanel.className = 'ui-panel';
    this.uiPanel.innerHTML = `
      <div>Level <span id="level">1</span></div>
      <div>Score: <span id="score">0</span> / <span id="target-score">1000</span></div>
      <div>Moves: <span id="moves">30</span></div>
      <div><button id="restart-btn" class="button">Restart</button></div>
    `;
    this.container.insertBefore(this.uiPanel, this.canvas);

    // Привязываем обработчик перезапуска
    document.getElementById('restart-btn').addEventListener('click', () => {
      window.location.reload();
    });
  }

  updateUI() {
    const gs = this.board.gameState;
    document.getElementById('level').textContent = gs.level;
    document.getElementById('score').textContent = gs.score;
    document.getElementById('target-score').textContent = gs.targetScore;
    document.getElementById('moves').textContent = gs.movesLeft;
  }

  showLevelComplete(level, score, targetScore, callback) {
    this._overlay = { level, score, targetScore, alpha: 0 };
    this.boardContainer.style.pointerEvents = 'none';
    this.render();

    // Создаём прозрачную DOM-плашку для обработки клика (pointerEvents: none на canvas не пропускает события)
    const clickOverlay = document.createElement('div');
    clickOverlay.id = 'click-overlay';
    clickOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:999;cursor:pointer;';
    document.body.appendChild(clickOverlay);

    const finish = () => {
      clickOverlay.remove();
      this.boardContainer.style.pointerEvents = 'auto';
      this._overlay = null;
      if (callback) callback();
    };

    clickOverlay.addEventListener('click', finish);

    const duration = 1800;
    const fadeIn = 400;
    const t0 = performance.now();

    const tick = (now) => {
      if (!this._overlay) return;
      const elapsed = now - t0;
      const alpha = Math.min(1, elapsed / fadeIn);
      this._overlay.alpha = alpha;
      try { this.render(); } catch (e) { console.error(e); finish(); return; }
      if (elapsed < duration) {
        requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    requestAnimationFrame(tick);
  }

  showGameOver(level, score, callback) {
    const existing = document.getElementById('gameover-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'gameover-modal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Game Over</h2>
        <p>Reached Level ${level} with ${score} points.</p>
        <button id="gameover-btn" class="button">Try Again</button>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('gameover-btn').addEventListener('click', () => {
      modal.remove();
      if (callback) callback();
    });
  }
  render() {
    // Очищаем canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Рисуем фон (опционально)
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Собираем tile'ы которые в анимации
    const animTiles = new Set();
    if (this._swapAnim) {
      animTiles.add(this._swapAnim[0].tile);
      animTiles.add(this._swapAnim[1].tile);
    }
    if (this._gravityAnim) {
      for (const m of this._gravityAnim.movements) animTiles.add(m.tile);
      for (const s of this._gravityAnim.spawns) animTiles.add(s.tile);
    }
    
    // Рисуем все плитки, кроме перетаскиваемой и анимируемых
    for (let y = 0; y < this.board.height; y++) {
      for (let x = 0; x < this.board.width; x++) {
        const tile = this.board.getTileAt(x, y);
        if (tile) {
          if (this.dragState && this.dragState.tile.x === x && this.dragState.tile.y === y) continue;
          if (animTiles.has(tile)) continue;
          this.drawTile(x, y, tile);
        }
      }
    }
    
    // Подсветка целевой клетки при перетаскивании
    if (this.dropTarget) {
      const { x, y } = this.dropTarget;
      const screenX = this.offsetX + x * (this.tileSize + this.cellGap);
      const screenY = this.offsetY + y * (this.tileSize + this.cellGap);
      this.ctx.save();
      this.ctx.strokeStyle = '#00ff00';
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = 'rgba(0,255,0,0.3)';
      this.ctx.shadowBlur = 10;
      this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
      this.ctx.restore();
    }
    
    // Рисуем анимируемые плитки обмена
    if (this._swapAnim) {
      for (const item of this._swapAnim) {
        this.drawTile(item.tile.x, item.tile.y, item.tile, { x: item.x, y: item.y });
      }
    }
    
    // Рисуем анимируемые плитки падения
    if (this._gravityAnim) {
      for (const m of this._gravityAnim.movements) {
        this.drawTile(m.tile.x, m.tile.y, m.tile, { x: m.currentX, y: m.currentY });
      }
      for (const s of this._gravityAnim.spawns) {
        this.drawTile(s.tile.x, s.tile.y, s.tile, { x: s.currentX, y: s.currentY });
      }
    }
    
    // Рисуем анимацию взрыва
    if (this._explosionAnim && this._explosionProgress > 0) {
      const t = this._explosionProgress;
      for (const item of this._explosionAnim) {
        const scale = 1 + 0.5 * Math.sin(t * Math.PI);
        const alpha = 1 - Math.pow(t, 1.2);
        const rotation = t * 0.3;
        const cx = item.x + this.tileSize / 2;
        const cy = item.y + this.tileSize / 2;

        this.ctx.save();
        this.ctx.translate(cx, cy);
        this.ctx.rotate(rotation);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-cx, -cy);
        this.ctx.globalAlpha = alpha;

        this._drawTileContent(item.x, item.y, item.tile);

        this.ctx.restore();
      }

      // Частицы взрыва
      for (const p of this._explosionParticles) {
        const pAlpha = 1 - Math.pow(p.t, 1.5);
        const pScale = 0.5 + 0.5 * (1 - p.t);
        this.ctx.save();
        this.ctx.globalAlpha = pAlpha;
        this.ctx.fillStyle = p.color;
        this.ctx.translate(p.x, p.y);
        this.ctx.scale(pScale, pScale);
        this.ctx.fillRect(-3, -3, 6, 6);
        this.ctx.restore();
      }
    }

    // Рисуем перетаскиваемую плитку поверх всего
    if (this.dragState) {
      this.drawDraggedTile();
    }

    // Оверлей завершения уровня
    if (this._overlay) {
      this.drawOverlay();
    }
  }

  drawOverlay() {
    const o = this._overlay;
    if (!o) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Затемнение фона
    this.ctx.save();
    this.ctx.fillStyle = `rgba(0,0,0,${0.5 * o.alpha})`;
    this.ctx.fillRect(0, 0, w, h);

    // Плашка с результатом
    const boxW = Math.min(360, w * 0.8);
    const boxH = 180;
    const bx = (w - boxW) / 2;
    const by = (h - boxH) / 2;

    this.ctx.fillStyle = `rgba(255,255,255,${o.alpha})`;
    this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
    this.ctx.shadowBlur = 30;
    this.ctx.fillRect(bx, by, boxW, boxH);
    this.ctx.shadowBlur = 0;

    // Текст
    this.ctx.fillStyle = `rgba(0,0,0,${o.alpha})`;
    this.ctx.font = `bold ${Math.min(32, boxW * 0.09)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`Level ${o.level} Complete!`, w / 2, by + 50);

    this.ctx.font = `${Math.min(20, boxW * 0.055)}px sans-serif`;
    this.ctx.fillStyle = `rgba(80,80,80,${o.alpha})`;
    this.ctx.fillText(`Score: ${o.score} / ${o.targetScore}`, w / 2, by + 110);

    this.ctx.restore();
  }

  drawDraggedTile() {
    const { tile, dragX, dragY } = this.dragState;
    const cx = dragX + this.tileSize / 2;
    const cy = dragY + this.tileSize / 2;

    this.ctx.save();

    // Тень для эффекта поднятия
    this.ctx.shadowColor = 'rgba(0,0,0,0.35)';
    this.ctx.shadowBlur = 25;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 12;

    // Небольшое увеличение и поворот для динамики
    this.ctx.translate(cx, cy);
    this.ctx.rotate(0.04);
    this.ctx.scale(1.1, 1.1);
    this.ctx.translate(-cx, -cy);

    this.drawTile(tile.x, tile.y, tile, { x: dragX, y: dragY });

    this.ctx.restore();
  }

  /**
   * Рисует базовое содержимое плитки (цвет, текстура, декор) в заданной позиции
   */
  _drawTileContent(screenX, screenY, tile) {
    let texture = TILE_TEXTURES[tile.type];
    if (tile.special === 'colorBomb') texture = SPECIAL_TEXTURES.colorBomb;
    if (tile.special === 'lightningRow' || tile.special === 'lightningCol') {
      const map = TILE_TEXTURES_SPECIAL[tile.special];
      texture = map?.[tile.type] ?? texture;
    }
    const color = TILE_COLORS[tile.type] || '#808080';

    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

    if (!this.texturesCache) this.texturesCache = {};
    if (texture) {
      let img = this.texturesCache[texture];
      if (!img) {
        img = new Image();
        img.src = texture;
        this.texturesCache[texture] = img;
        img.onload = () => { this.render(); };
      }
      if (img.complete && img.naturalWidth > 0) {
        this.ctx.drawImage(img, screenX, screenY, this.tileSize, this.tileSize);
      }
    }

    this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
    this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
    this.ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize * 0.3);
  }

  /**
   * Рисует отдельную плитку
   * @param {number} x - координата по x на доске
   * @param {number} y - координата по y на доске
   * @param {Object} tile - объект плитки
   * @param {Object|null} overridePos - {x, y} позиция на канвасе (для перетаскивания)
   */
  drawTile(x, y, tile, overridePos = null) {
    const screenX = overridePos?.x ?? (this.offsetX + x * (this.tileSize + this.cellGap));
    const screenY = overridePos?.y ?? (this.offsetY + y * (this.tileSize + this.cellGap));

    let scale = 1;
    let alpha = 1;

    if (!overridePos) {
      const now = Date.now();
      const ageMs = typeof tile.spawnedAt === 'number' ? now - tile.spawnedAt : 999999;

      if (tile.special) {
        const effectDuration = 250;
        const t = Math.max(0, Math.min(1, ageMs / effectDuration));
        const easeOut = 1 - Math.pow(1 - t, 3);
        scale = ageMs < effectDuration ? 0.5 + 0.5 * easeOut : 1;
        alpha = ageMs < effectDuration ? 0.3 + 0.7 * easeOut : 1;
        
        // Rotation for color bomb: spin in from 180 degrees
        let rotation = 0;
        if (tile.special === 'colorBomb' && ageMs < effectDuration) {
          const rotationStart = Math.PI; // 180 degrees
          rotation = rotationStart * (1 - t); // eases from PI to 0
        }
        
        if (ageMs < effectDuration) this.ensureAnimationLoop();
      } else {
        const spawnDurationMs = 180;
        const t = Math.max(0, Math.min(1, ageMs / spawnDurationMs));
        const easeOut = 1 - Math.pow(1 - t, 3);
        scale = ageMs < spawnDurationMs ? 0.6 + 0.4 * easeOut : 1;
        alpha = ageMs < spawnDurationMs ? 0.35 + 0.65 * easeOut : 1;
        if (ageMs < spawnDurationMs) this.ensureAnimationLoop();
      }
    }

    const cx = screenX + this.tileSize / 2;
    const cy = screenY + this.tileSize / 2;
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(scale, scale);
    
    // Apply rotation for color bomb spawn effect
    if (tile.special === 'colorBomb' && !overridePos) {
      const now = Date.now();
      const ageMs = typeof tile.spawnedAt === 'number' ? now - tile.spawnedAt : 999999;
      if (ageMs < 250) {
        const t = ageMs / 250;
        const rotationStart = Math.PI; // 180 degrees
        const rotation = rotationStart * (1 - t);
        this.ctx.rotate(rotation);
      }
    }
    
    this.ctx.translate(-cx, -cy);
    this.ctx.globalAlpha = alpha;

    if (tile.special && !overridePos) {
      const now = Date.now();
      const ageMs = typeof tile.spawnedAt === 'number' ? now - tile.spawnedAt : 999999;
      if (ageMs < 250) {
        const progress = ageMs / 250;
        const glowColor = tile.special === 'colorBomb' ? '#aa66ff' : TILE_COLORS[tile.type] || '#fff';
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = 20 * (1 - progress);
        this.ensureAnimationLoop();
      }
    }

    this._drawTileContent(screenX, screenY, tile);

    this.ctx.restore();
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

  // --- Swap Animation ---

  screenPos(x, y) {
    return {
      x: this.offsetX + x * (this.tileSize + this.cellGap),
      y: this.offsetY + y * (this.tileSize + this.cellGap),
    };
  }

  /**
   * Анимация обмена двух плиток
   * @param {{x:number,y:number}} c1 координаты первой клетки
   * @param {{x:number,y:number}} c2 координаты второй клетки
   * @param {boolean} reverse обратное направление
   * @param {number} duration мс
   * @returns {Promise<void>}
   */
  animateSwap(c1, c2, reverse = false, duration = 180) {
    const s1 = this.screenPos(c1.x, c1.y);
    const s2 = this.screenPos(c2.x, c2.y);
    const t1 = this.board.getTileAt(c1.x, c1.y);
    const t2 = this.board.getTileAt(c2.x, c2.y);
    if (!t1 || !t2) return Promise.resolve();

    // forward:  t1 (was at c2) slides c2→c1, t2 (was at c1) slides c1→c2
    // backward: t1 slides c1→c2, t2 slides c2→c1
    const f1 = reverse ? s1 : s2;
    const t1p = reverse ? s2 : s1;
    const f2 = reverse ? s2 : s1;
    const t2p = reverse ? s1 : s2;

    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        this._swapAnim = [
          { tile: t1, x: f1.x + (t1p.x - f1.x) * ease, y: f1.y + (t1p.y - f1.y) * ease },
          { tile: t2, x: f2.x + (t2p.x - f2.x) * ease, y: f2.y + (t2p.y - f2.y) * ease },
        ];
        this.render();
        if (t < 1) requestAnimationFrame(tick);
        else { this._swapAnim = null; this.render(); resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }

  /**
   * Анимация падения плиток после гравитации
   * @param {{ movements: Array, spawns: Array }} data из Board.applyGravity()
   * @param {number} duration мс
   * @returns {Promise<void>}
   */
  animateGravity(data, duration = 250) {
    const movements = data.movements.map((m) => {
      const from = this.screenPos(m.fromX, m.fromY);
      const to = this.screenPos(m.toX, m.toY);
      return { tile: m.tile, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, currentX: from.x, currentY: from.y };
    });
    const spawns = data.spawns.map((s) => {
      const from = this.screenPos(s.x, -1);
      const to = this.screenPos(s.x, s.y);
      return { tile: s.tile, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, currentX: from.x, currentY: from.y };
    });

    if (movements.length === 0 && spawns.length === 0) return Promise.resolve();

    this._gravityAnim = { movements, spawns };

    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        for (const m of this._gravityAnim.movements) {
          m.currentX = m.fromX + (m.toX - m.fromX) * ease;
          m.currentY = m.fromY + (m.toY - m.fromY) * ease;
        }
        for (const s of this._gravityAnim.spawns) {
          s.currentX = s.fromX + (s.toX - s.fromX) * ease;
          s.currentY = s.fromY + (s.toY - s.fromY) * ease;
        }
        this.render();
        if (t < 1) requestAnimationFrame(tick);
        else { this._gravityAnim = null; this.render(); resolve(); }
      };
      requestAnimationFrame(tick);
    });
  }

  /**
   * Анимация взрыва/исчезновения совпавших плиток
   * @param {Array} tiles массив объектов tile
   * @param {number} duration мс
   * @returns {Promise<void>}
   */
  animateExplosion(tiles, duration = 300) {
    if (tiles.length === 0) return Promise.resolve();

    this._matchSound.currentTime = 0;
    this._matchSound.play().catch(() => {});

    const color = TILE_COLORS[tiles[0].type] || '#ffffff';
    this._explosionAnim = tiles.map((t) => ({
      tile: t,
      x: this.offsetX + t.x * (this.tileSize + this.cellGap),
      y: this.offsetY + t.y * (this.tileSize + this.cellGap),
    }));
    this._explosionParticles = [];
    for (const t of tiles) {
      const cx = this.offsetX + t.x * (this.tileSize + this.cellGap) + this.tileSize / 2;
      const cy = this.offsetY + t.y * (this.tileSize + this.cellGap) + this.tileSize / 2;
      const baseColor = TILE_COLORS[t.type] || '#ffffff';
      for (let i = 0; i < 4; i++) {
        this._explosionParticles.push({
          x: cx, y: cy,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          t: 0,
          color: baseColor,
        });
      }
    }

    return new Promise((resolve) => {
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        this._explosionProgress = t;
        for (const p of this._explosionParticles) {
          p.t = t;
          p.x += p.vx;
          p.y += p.vy;
        }
        this.render();
        if (t < 1) requestAnimationFrame(tick);
        else {
          this._explosionAnim = null;
          this._explosionParticles = [];
          this._explosionProgress = 0;
          this.render();
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  // --- Drag and Drop API ---

  setDrag(tile, clientX, clientY) {
    const screenX = this.offsetX + tile.x * (this.tileSize + this.cellGap);
    const screenY = this.offsetY + tile.y * (this.tileSize + this.cellGap);
    this.dragState = {
      tile,
      offsetX: clientX - screenX,
      offsetY: clientY - screenY,
      dragX: screenX,
      dragY: screenY,
    };
    this.canvas.style.cursor = 'grabbing';
  }

  updateDrag(clientX, clientY) {
    if (!this.dragState) return;
    this.dragState.dragX = clientX - this.dragState.offsetX;
    this.dragState.dragY = clientY - this.dragState.offsetY;
  }

  clearDrag() {
    this.dragState = null;
    this.dropTarget = null;
    this.canvas.style.cursor = 'pointer';
  }

  setDropTarget(x, y) {
    if (x === null || y === null) {
      this.dropTarget = null;
    } else {
      this.dropTarget = { x, y };
    }
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

    const step = this.tileSize + this.cellGap;
    const relX = canvasX - this.offsetX;
    const relY = canvasY - this.offsetY;
    const x = Math.floor(relX / step);
    const y = Math.floor(relY / step);

    // Клик в зоне зазора между клетками не выбирает тайл
    if (x >= 0 && y >= 0) {
      const localX = relX - x * step;
      const localY = relY - y * step;
      if (localX > this.tileSize || localY > this.tileSize) {
        return null;
      }
    }

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
      const screenX = this.offsetX + x * (this.tileSize + this.cellGap);
      const screenY = this.offsetY + y * (this.tileSize + this.cellGap);
      
      this.ctx.strokeStyle = '#00ff00'; // Зеленый контур для выделения
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(screenX, screenY, this.tileSize, this.tileSize);
    }
  }
}