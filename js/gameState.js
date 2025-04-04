const gameState = {
  player1Connected: false,
  player2Connected: false,
  gameStarted: false,
  gameEnded: false,
  animationStarted: false,
  signedMoveManager: null, // Renamed from moveValidator
  genesisHash: ethers.constants.HashZero, // Use a standard genesis hash
  moveSync: new MoveSync(30), // Still used for freeplay and playback history
  lastMoveTime: 0 // Time of last move sent
};

// Initialize the signed move manager (only used in wallet mode)
function initSignedMoveManager(localPlayerId) {
  // Only initialize if in wallet mode
  if (gameMode === 'wallet') {
    // Use a fixed genesis hash or derive one if needed
    // gameState.genesisHash = ethers.utils.id("CryptoFighterGenesis");
    gameState.signedMoveManager = new SignedMoveManager(localPlayerId, gameState.genesisHash);
    console.log(`SignedMoveManager initialized for ${localPlayerId} with genesis ${gameState.genesisHash}`);
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
