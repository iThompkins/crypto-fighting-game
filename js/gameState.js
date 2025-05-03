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

// Initialize the signed state manager (only used in wallet mode)
// Takes gameId to use as the genesis hash for the state chain
function initSignedStateManager(localPlayerId, gameId) {
  // Only initialize if in wallet mode and gameId is provided
  if (gameMode === 'wallet' && gameId) {
    // Use the gameId directly as the genesis hash for this game instance
    // Hash the gameId string to get bytes32
    const genesisHash = ethers.utils.id(gameId);
    gameState.signedStateManager = new SignedStateManager(localPlayerId, genesisHash);
    console.log(`SignedStateManager initialized for Player ${localPlayerId} for game ${gameId.substring(0,8)}... (Genesis: ${genesisHash})`);
    
    // Start the state sync loop
    startStateSyncLoop();
  }
}

// Function to start the state synchronization loop at 30 FPS
function startStateSyncLoop() {
  if (!gameState.stateSyncInterval) {
    gameState.stateSyncInterval = setInterval(async () => {
      if (gameState.gameStarted && !gameState.gameEnded && gameState.signedStateManager) {
        // Only sync if the game is active and we have a state manager
        await syncGameState();
      }
    }, 1000 / 30); // 30 FPS
    
    console.log("Started game state sync loop at 30 FPS");
  }
}

// Function to stop the state sync loop
function stopStateSyncLoop() {
  if (gameState.stateSyncInterval) {
    clearInterval(gameState.stateSyncInterval);
    gameState.stateSyncInterval = null;
    console.log("Stopped game state sync loop");
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
