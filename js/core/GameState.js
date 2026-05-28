export class GameState {
  constructor() {
    this.score = 0;
    this.movesLeft = 20;
    this.level = 1;
    this.targetScore = 1000;
    this.numTileTypes = 5;
  }

  initLevel(level) {
    this.level = level;
    this.score = 0;
    this.movesLeft = 20;
    this.targetScore = 300 + (level - 1) * 250;
  }

  addScore(amount) {
    this.score += amount;
  }

  useMove() {
    if (this.movesLeft > 0) {
      this.movesLeft--;
    }
  }

  reset() {
    this.initLevel(1);
  }

  advanceLevel() {
    this.level++;
    this.score = 0;
    this.movesLeft = 20;
    this.targetScore = 300 + (this.level - 1) * 250;
  }

  isLevelComplete() {
    return this.score >= this.targetScore;
  }

  isGameOver() {
    return this.movesLeft <= 0 && !this.isLevelComplete();
  }
}
