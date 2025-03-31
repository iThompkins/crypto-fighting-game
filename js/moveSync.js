// Game move synchronization system
class MoveSync {
  constructor(fps = 30) {
    this.moveHistory = [];
    this.opponentMoveHistory = [];
    this.lastSequence = 0;
    this.targetFps = fps;
    this.currentFps = fps;
    this.gameStartTime = 0;
    this.lastProcessedFrame = -1;
    this.isHost = false; // Will be set when game starts
  }

  // Initialize with game start time
  initGame(isHost) {
    this.gameStartTime = Date.now();
    this.isHost = isHost;
    this.lastSequence = 0;
    this.moveHistory = [];
    this.opponentMoveHistory = [];
    this.lastProcessedFrame = -1;
  }

  // Add a new move to the history
  addMove(keys, timestamp) {
    const move = {
      keys: Array.from(keys),
      timestamp: timestamp || Date.now(),
      sequence: ++this.lastSequence,
      isHost: this.isHost // Track which player made this move
    };
    
    this.moveHistory.push(move);
    return move;
  }

  // Get the entire move history
  getMoveHistory() {
    return this.moveHistory;
  }

  // Get the latest move sequence number
  getLatestSequence() {
    return this.lastSequence;
  }

  // Get current game time in milliseconds
  getGameTime() {
    if (this.gameStartTime === 0) return 0;
    return Date.now() - this.gameStartTime;
  }

  // Get current game frame based on elapsed time
  getCurrentFrame() {
    return Math.floor(this.getGameTime() / (1000 / this.targetFps));
  }

  // Process received move history from opponent
  processOpponentHistory(receivedHistory) {
    if (!receivedHistory || !receivedHistory.length) {
      return { valid: false, reason: 'No moves received' };
    }

    // Store the opponent's complete move history
    this.opponentMoveHistory = receivedHistory;
    
    // Find new moves that we don't have yet
    const existingSequences = new Set(this.moveHistory.map(move => move.sequence));
    const newMoves = receivedHistory.filter(move => !existingSequences.has(move.sequence));
    
    if (newMoves.length === 0) {
      return { valid: true, newMoves: [] };
    }
    
    // Sort by timestamp to ensure proper ordering
    newMoves.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`Received ${newMoves.length} new opponent moves`);
    
    return { valid: true, newMoves };
  }
  
  // Get all moves (both players) for a specific frame
  getMovesForFrame(frameNumber) {
    // Calculate timestamp range for this frame
    const frameStartTime = this.gameStartTime + (frameNumber * (1000 / this.targetFps));
    const frameEndTime = frameStartTime + (1000 / this.targetFps);
    
    // Get all moves within this time range
    const combinedHistory = [...this.moveHistory, ...this.opponentMoveHistory];
    
    // Sort by timestamp
    combinedHistory.sort((a, b) => a.timestamp - b.timestamp);
    
    // Filter moves for this frame
    return combinedHistory.filter(move => 
      move.timestamp >= frameStartTime && move.timestamp < frameEndTime
    );
  }
  
  // Get all moves up to the current frame that haven't been processed yet
  getUnprocessedMoves() {
    const currentFrame = this.getCurrentFrame();
    
    // If we've already processed this frame, return empty
    if (currentFrame <= this.lastProcessedFrame) {
      return [];
    }
    
    // Get all moves from the last processed frame up to current frame
    let moves = [];
    for (let frame = this.lastProcessedFrame + 1; frame <= currentFrame; frame++) {
      moves = [...moves, ...this.getMovesForFrame(frame)];
    }
    
    // Update last processed frame
    this.lastProcessedFrame = currentFrame;
    
    return moves;
  }
  
  // Get the current game timer value in seconds
  getGameTimerValue(totalGameTime = 10) {
    const elapsedSeconds = Math.floor(this.getGameTime() / 1000);
    return Math.max(0, totalGameTime - elapsedSeconds);
  }
  
  // Get the current FPS
  getCurrentFps() {
    return this.targetFps;
  }
  
  // Clear move history (e.g., when game restarts)
  clear() {
    this.moveHistory = [];
    this.opponentMoveHistory = [];
    this.lastSequence = 0;
    this.gameStartTime = 0;
    this.lastProcessedFrame = -1;
  }
}
