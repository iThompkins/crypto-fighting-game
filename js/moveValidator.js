class GameMove {
  constructor(playerId, prevHash, keyCode, timestamp) {
    this.playerId = playerId;
    this.prevHash = prevHash;
    this.keyCode = keyCode;
    this.timestamp = timestamp;
    this.sequence = 0; // Will be set when added to chain
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const data = `${this.playerId}:${this.prevHash}:${this.keyCode}:${this.timestamp}:${this.sequence}`;
    return btoa(data); // Simple hash for demo - use proper crypto in production
  }
}

class MoveValidator {
  constructor(playerId, genesisHash) {
    this.playerId = playerId;
    this.genesisHash = genesisHash;
    this.moveChain = new Set();
    this.sequence = 0;
  }

  createMove(keyCode) {
    const lastMove = Array.from(this.moveChain).pop();
    const prevHash = lastMove ? lastMove.hash : this.genesisHash;
    const move = new GameMove(this.playerId, prevHash, keyCode, Date.now());
    move.sequence = ++this.sequence;
    return move;
  }

  addMove(move) {
    this.moveChain.add(move);
  }

  validateMoveChain(incomingChain) {
    // Convert incoming chain to Set for comparison
    const receivedMoves = new Set(incomingChain);
    
    // Check if chains match except for the latest move
    const localMoves = Array.from(this.moveChain);
    const receivedMovesArr = Array.from(receivedMoves);
    
    // The received chain should be exactly one move longer
    if (receivedMovesArr.length !== localMoves.length + 1) {
      return { valid: false, reason: 'Invalid chain length' };
    }

    // Verify all local moves exist in received chain
    for (const move of localMoves) {
      if (!receivedMoves.has(move)) {
        return { valid: false, reason: 'Missing moves in chain' };
      }
    }

    // Verify the new move's previous hash points to our last move
    const newMove = receivedMovesArr[receivedMovesArr.length - 1];
    const lastLocalMove = localMoves[localMoves.length - 1];
    
    if (newMove.prevHash !== (lastLocalMove ? lastLocalMove.hash : this.genesisHash)) {
      return { valid: false, reason: 'Invalid move chain' };
    }

    return { valid: true, newMove };
  }

  getMoveChain() {
    return Array.from(this.moveChain);
  }
}
