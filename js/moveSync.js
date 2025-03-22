// Game move synchronization system
class MoveSync {
  constructor(fps = 30) {
    this.moveHistory = [];
    this.lastSequence = 0;
    this.targetFps = fps;
    this.currentFps = fps;
    this.pendingMoves = []; // Queue of moves to be applied
    this.lastMoveTime = 0;
    this.processingMoves = false;
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

  // Get the entire move history
  getMoveHistory() {
    return this.moveHistory;
  }

  // Get the latest move sequence number
  getLatestSequence() {
    return this.lastSequence;
  }

  // Process received move history from opponent
  processOpponentHistory(receivedHistory) {
    if (!receivedHistory || !receivedHistory.length) {
      return { valid: false, reason: 'No moves received' };
    }

    // Sort received moves by sequence
    const sortedMoves = [...receivedHistory].sort((a, b) => a.sequence - b.sequence);
    
    // Find new moves that we don't have yet
    const newMoves = [];
    const existingSequences = new Set(this.moveHistory.map(move => move.sequence));
    
    for (const move of sortedMoves) {
      if (!existingSequences.has(move.sequence)) {
        newMoves.push(move);
      }
    }
    
    if (newMoves.length === 0) {
      return { valid: true, newMoves: [] };
    }
    
    // Validate move sequence continuity
    newMoves.sort((a, b) => a.sequence - b.sequence);
    for (let i = 1; i < newMoves.length; i++) {
      if (newMoves[i].sequence !== newMoves[i-1].sequence + 1) {
        return { 
          valid: false, 
          reason: `Non-continuous sequence: ${newMoves[i-1].sequence} to ${newMoves[i].sequence}` 
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
    
    // Add new moves to the pending queue for gradual application
    this.pendingMoves.push(...newMoves);
    
    // Add valid moves to our history
    for (const move of newMoves) {
      this.moveHistory.push(move);
      if (move.sequence > this.lastSequence) {
        this.lastSequence = move.sequence;
      }
    }
    
    return { valid: true, newMoves };
  }
  
  // Get the next move to apply based on frame timing
  getNextMoveToApply() {
    if (this.pendingMoves.length === 0) {
      return null;
    }
    
    const now = Date.now();
    const timeSinceLastMove = now - this.lastMoveTime;
    const frameTime = 1000 / this.targetFps;
    
    // Only apply a move if enough time has passed since the last one
    if (timeSinceLastMove >= frameTime) {
      this.lastMoveTime = now;
      return this.pendingMoves.shift(); // Get and remove the first move
    }
    
    return null;
  }
  
  // Get the current FPS
  getCurrentFps() {
    return this.targetFps;
  }
  
  // Clear move history (e.g., when game restarts)
  clear() {
    this.moveHistory = [];
    this.pendingMoves = [];
    this.lastSequence = 0;
    this.lastMoveTime = 0;
  }
}
