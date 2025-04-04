// Game move synchronization system
class MoveSync {
  constructor(fps = 30) {
    this.targetFps = fps;
    this.gameStartTime = 0;
    this.isHost = false;
    
    // Player states
    this.localPlayerState = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      health: 100,
      facingLeft: false,
      isAttacking: false,
      currentSprite: 'idle',
      dead: false,
      lastUpdate: 0
    };
    
    this.remotePlayerState = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      health: 100,
      facingLeft: false,
      isAttacking: false,
      currentSprite: 'idle',
      dead: false,
      lastUpdate: 0
    };
    
    // For playback
    this.moveHistory = [];
    this.lastSequence = 0;
  }

  // Initialize with game start time
  initGame(isHost) {
    this.gameStartTime = Date.now();
    this.isHost = isHost;
    this.lastSequence = 0;
    this.moveHistory = [];
    
    // Initialize player states based on host status
    if (isHost) {
      this.localPlayerState.position = { x: 200, y: 330 };
      this.localPlayerState.facingLeft = false;
      this.remotePlayerState.position = { x: 700, y: 330 };
      this.remotePlayerState.facingLeft = true;
    } else {
      this.localPlayerState.position = { x: 700, y: 330 };
      this.localPlayerState.facingLeft = true;
      this.remotePlayerState.position = { x: 200, y: 330 };
      this.remotePlayerState.facingLeft = false;
    }
  }

  // Update local player state
  updateLocalState(player) {
    this.localPlayerState = {
      position: { ...player.position },
      velocity: { ...player.velocity },
      health: player.health,
      facingLeft: player.facingLeft,
      isAttacking: player.isAttacking,
      currentSprite: player.currentSprite || 'idle',
      dead: player.dead,
      lastUpdate: Date.now()
    };
    
    // Add to move history for playback
    const move = {
      state: { ...this.localPlayerState },
      timestamp: Date.now(),
      sequence: ++this.lastSequence,
      isHost: this.isHost
    };
    
    this.moveHistory.push(move);
    return this.localPlayerState;
  }

  // Process received state from opponent
  processRemoteState(remoteState) {
    if (!remoteState) return false;
    
    // Update remote player state
    this.remotePlayerState = {
      ...remoteState,
      lastUpdate: Date.now()
    };
    
    // Add to move history for playback
    const move = {
      state: { ...this.remotePlayerState },
      timestamp: Date.now(),
      sequence: ++this.lastSequence,
      isHost: !this.isHost
    };
    
    this.moveHistory.push(move);
    return true;
  }
  
  // Get the current game timer value in seconds
  getGameTimerValue(totalGameTime = 10) {
    const elapsedSeconds = Math.floor(this.getGameTime() / 1000);
    return Math.max(0, totalGameTime - elapsedSeconds);
  }
  
  // Get current game time in milliseconds
  getGameTime() {
    if (this.gameStartTime === 0) return 0;
    return Date.now() - this.gameStartTime;
  }
  
  // Get the entire move history for playback
  getMoveHistory() {
    return this.moveHistory;
  }
  
  // Get the current FPS
  getCurrentFps() {
    return this.targetFps;
  }
  
  // Clear all state (e.g., when game restarts)
  clear() {
    this.moveHistory = [];
    this.lastSequence = 0;
    this.gameStartTime = 0;
    
    this.localPlayerState = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      health: 100,
      facingLeft: false,
      isAttacking: false,
      currentSprite: 'idle',
      dead: false,
      lastUpdate: 0
    };
    
    this.remotePlayerState = {
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      health: 100,
      facingLeft: false,
      isAttacking: false,
      currentSprite: 'idle',
      dead: false,
      lastUpdate: 0
    };
  }
}
