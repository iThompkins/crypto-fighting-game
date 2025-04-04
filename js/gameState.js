const gameState = {
  player1Connected: false,
  player2Connected: false,
  gameStarted: false,
  gameEnded: false,
  animationStarted: false,
  signedMoveManager: null,
  currentGameId: null, // Added to store the active game ID from contract
  moveSync: new MoveSync(30), // Still used for freeplay and playback history
  lastMoveTime: 0
};

// Initialize the signed move manager (only used in wallet mode)
// Now takes gameId to use as the genesis hash for the move chain
function initSignedMoveManager(localPlayerId, gameId) {
  // Only initialize if in wallet mode and gameId is provided
  if (gameMode === 'wallet' && gameId) {
    // Use the gameId directly as the genesis hash for this game instance
    // Ensure it's treated as bytes32 if necessary by hashing it, or use as string if validator handles it.
    // Let's assume SignedMoveManager expects a bytes32 hash. We hash the gameId string.
    const genesisHash = ethers.utils.id(gameId); // Hash the gameId string to get bytes32
    gameState.signedMoveManager = new SignedMoveManager(localPlayerId, genesisHash);
    console.log(`SignedMoveManager initialized for ${localPlayerId} for game ${gameId.substring(0,8)}... (Genesis: ${genesisHash})`);
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
