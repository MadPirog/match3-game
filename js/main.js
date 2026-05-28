import { Board } from './core/Board.js';
import { CanvasRenderSystem } from './systems/CanvasRenderSystem.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameState } from './core/GameState.js';

class Game {
  constructor() {
    this.state = new GameState();
    this.state.initLevel(1);
    this.board = new Board(8, 8, this.state);
    this.render = new CanvasRenderSystem(this.board);
    this.input = new InputSystem(this.board, this.state, this.render);
    this.input.onLevelComplete = () => this.nextLevel();
    this.input.onGameOver = () => this.showGameOver();
    this.start();
  }

  start() {
    this.board.generate();
    this.render.render();
    this.render.updateUI();
  }

  nextLevel() {
    const prevLevel = this.state.level;
    const prevScore = this.state.score;

    this.render.showLevelComplete(prevLevel, prevScore, this.state.targetScore, () => {
      this.state.advanceLevel();
      this.board.generate();
      this.render.render();
      this.render.updateUI();
    });
  }

  showGameOver() {
    this.render.showGameOver(this.state.level, this.state.score, () => {
      this.state.initLevel(1);
      this.board.generate();
      this.render.render();
      this.render.updateUI();
    });
  }
}

window.addEventListener('load', () => {
  new Game();
});
