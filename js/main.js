import { Board } from './core/Board.js';
import { RenderSystem } from './systems/RenderSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameState } from './core/GameState.js';

class Game {
  constructor() {
    this.state = new GameState();
    this.board = new Board(8, 8, this.state);
    this.render = new RenderSystem(this.board);
    this.input = new InputSystem(this.board, this.state, this.render);
    this.start();
  }
  start() {
    this.board.generate();
    this.render.render();
  }
}

window.addEventListener('load', () => {
  new Game();
});