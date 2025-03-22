// Game move synchronization system
class MoveSync {
  constructor(fps = 30) {
    this.moveHistory = [];
    this.lastSequence = 0;
    this.targetFps = fps;
    this.currentFps = fps;
    this.lastUpdateTime = 0;
    this.frameDelta = 0;
    this.maxFrameDelta = 5; // Maximum allowed frame difference
  }

  // Add a new move to the history
  addMove(keys, timestamp) {
    const move = {
      keys: Array.from(keys),
      timestamp: timestamp || Date.now(),
      sequence: ++this.lastSequence
    };
    
    this.moveHistory.push(move);
    return move;
  }

  // Get all moves since a specific sequence number
  getMovesSince(sequence = 0) {
    return this.moveHistory.filter(move => move.sequence > sequence);
  }

  // Get the latest move sequence number
  getLatestSequence() {
    return this.lastSequence;
  }

  // Process received moves from opponent
  processMoves(receivedMoves) {
    if (!receivedMoves || !receivedMoves.length) return { valid: false, reason: 'No moves received' };

    // Sort received moves by sequence
    const sortedMoves = [...receivedMoves].sort((a, b) => a.sequence - b.sequence);
    
    // Get the latest move we have for this player
    const latestSequence = this.getLatestSequence();
    
    // Filter only new moves
    const newMoves = sortedMoves.filter(move => move.sequence > latestSequence);
    
    if (newMoves.length === 0) {
      return { valid: true, newMoves: [] };
    }
    
    // Validate move sequence continuity
    for (let i = 0; i < newMoves.length; i++) {
      const expectedSequence = latestSequence + i + 1;
      if (newMoves[i].sequence !== expectedSequence) {
        return { 
          valid: false, 
          reason: `Invalid sequence: expected ${expectedSequence}, got ${newMoves[i].sequence}` 
        };
      }
    }
    
    // Validate timestamps (ensure they're reasonably spaced)
    const minTimeBetweenMoves = 1000 / (this.targetFps * 1.5); // Allow 1.5x target fps as max
    for (let i = 1; i < newMoves.length; i++) {
      const timeDiff = newMoves[i].timestamp - newMoves[i-1].timestamp;
      if (timeDiff < minTimeBetweenMoves) {
        return { 
          valid: false, 
          reason: `Moves too close together: ${timeDiff}ms between moves` 
        };
      }
    }
    
    // Calculate frame delta (how many frames ahead/behind we are)
    const expectedMoveCount = Math.floor((Date.now() - this.lastUpdateTime) / (1000 / this.targetFps));
    this.frameDelta = newMoves.length - expectedMoveCount;
    
    // Clamp frame delta
    this.frameDelta = Math.max(-this.maxFrameDelta, Math.min(this.maxFrameDelta, this.frameDelta));
    
    // Add valid moves to our history
    newMoves.forEach(move => {
      this.moveHistory.push(move);
      this.lastSequence = move.sequence;
    });
    
    this.lastUpdateTime = Date.now();
    
    // Adjust FPS based on frame delta
    this.adjustFps();
    
    return { valid: true, newMoves };
  }
  
  // Adjust rendering FPS based on frame delta
  adjustFps() {
    // If we're ahead, slow down; if behind, speed up
    const adjustment = this.frameDelta * 2; // 2 fps per frame of difference
    this.currentFps = this.targetFps - adjustment;
    
    // Clamp to reasonable values (15-60 fps)
    this.currentFps = Math.max(15, Math.min(60, this.currentFps));
    
    return this.currentFps;
  }
  
  // Get the current adjusted FPS
  getCurrentFps() {
    return this.currentFps;
  }
  
  // Clear move history (e.g., when game restarts)
  clear() {
    this.moveHistory = [];
    this.lastSequence = 0;
    this.frameDelta = 0;
    this.currentFps = this.targetFps;
    this.lastUpdateTime = Date.now();
  }
}
