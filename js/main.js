import { Board } from './core/Board.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { CanvasRenderSystem } from './systems/CanvasRenderSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameState } from './core/GameState.js';

class Game {
  constructor() {
    this.state = new GameState();
    this.board = new Board(8, 8, this.state);
    
    // Выбор рендерера: true для Canvas, false для CSS
    // В реальном приложении это можно сделать настраиваемым
    const useCanvas = true; 
    
    if (useCanvas) {
      this.render = new CanvasRenderSystem(this.board);
    } else {
      this.render = new RenderSystem(this.board);
    }
    
    this.input = new InputSystem(this.board, this.state, this.render);
    this.start();
  }
  start() {
    this.board.generate();
    this.render.render();
    this.render.updateUI();
  }
}

window.addEventListener('load', () => {
  new Game();
});