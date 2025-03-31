const gameState = {
  player1Connected: false,
  player2Connected: false,
  gameStarted: false,
  gameEnded: false,
  animationStarted: false,
  moveValidator: null,
  genesisHash: null, // Will be set when game starts
  moveSync: new MoveSync(30), // Initialize with 30fps target
  lastMoveTime: 0 // Time of last move sent
};

// Initialize move validator (only used in wallet mode)
function initMoveValidator(playerId) {
  // Only initialize if in wallet mode
  if (gameMode === 'wallet') {
    // In wallet mode, this would come from smart contract
    gameState.genesisHash = 'genesis-' + Math.random().toString(36).substr(2);
    gameState.moveValidator = new MoveValidator(playerId, gameState.genesisHash);
  }
}


function startCountdown() {
  const countdownOverlay = document.getElementById('countdown-overlay');
  countdownOverlay.style.display = 'flex';
  let count = 3;
  
  const countInterval = setInterval(() => {
    if (count > 0) {
      document.getElementById('countdown-text').innerText = count;
      count--;
    } else if (count === 0) {
      document.getElementById('countdown-text').innerText = 'FIGHT!';
      count--;
    } else {
      clearInterval(countInterval);
      countdownOverlay.style.display = 'none';
      startGame();
    }
  }, 1000);
}

function startGame() {
  gameState.gameStarted = true;
  
  // Initialize game start time in move sync
  gameState.moveSync.initGame(isHost);
  
  // Ensure player orientations are correct
  player.facingLeft = false;
  player.switchSprite('idle');
  // Player 2 is already facing left by default
  
  // We don't need the old timer anymore as it's managed by moveSync
  // decreaseTimer();
}
