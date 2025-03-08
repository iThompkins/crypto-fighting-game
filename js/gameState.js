const gameState = {
  player1Connected: false,
  player2Connected: false,
  gameStarted: false,
  gameEnded: false,
  animationStarted: false,
  moveValidator: null,
  genesisHash: null // Will be set when game starts
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
  
  // Ensure player orientations are correct
  player.facingLeft = false;
  player2.facingLeft = true;
  player2.switchSprite('idle'); // Force sprite update with correct orientation
  
  decreaseTimer();
}
