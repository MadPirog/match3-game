export class GameState {
  constructor() {
    this.score = 0;
    this.movesLeft = 30; // default for level 1
    this.level = 1;
    this.targetScore = 1000; // example target
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
    this.score = 0;
    this.movesLeft = 30;
    this.level = 1;
  }

  isLevelComplete() {
    return this.score >= this.targetScore;
  }

  isGameOver() {
    return this.movesLeft <= 0 && !this.isLevelComplete();
  }
}