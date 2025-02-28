class GameMove {
  constructor(playerId, prevHash, keyCode, timestamp) {
    this.move = {
      playerId: playerId,
      prevHash: prevHash,
      keyCode: keyCode,
      timestamp: timestamp,
      sequence: 0 // Will be set when added to chain
    };
    this.signature = null;
    this.hash = null;
  }

  async sign(wallet) {
    // Create message to sign
    const message = JSON.stringify(this.move);
    // Sign with wallet
    this.signature = await wallet.signMessage(message);
    // Calculate hash after signing
    this.calculateHash();
    return this;
  }

  calculateHash() {
    const data = `${this.move.playerId}:${this.move.prevHash}:${this.move.keyCode}:${this.move.timestamp}:${this.move.sequence}:${this.signature}`;
    this.hash = btoa(data); // Simple hash for demo - use proper crypto in production
    return this.hash;
  }

  verify() {
    // Verify signature matches move data
    const message = JSON.stringify(this.move);
    try {
      const recoveredAddr = ethers.utils.verifyMessage(message, this.signature);
      return recoveredAddr === this.move.playerId;
    } catch (e) {
      console.error('Signature verification failed:', e);
      return false;
    }
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

    // Get the new move
    const newMove = receivedMovesArr[receivedMovesArr.length - 1];
    const lastLocalMove = localMoves[localMoves.length - 1];
    
    // Verify signature
    if (!newMove.verify()) {
      return { valid: false, reason: 'Invalid move signature' };
    }

    // Verify hash chain
    if (newMove.move.prevHash !== (lastLocalMove ? lastLocalMove.hash : this.genesisHash)) {
      return { valid: false, reason: 'Invalid move chain' };
    }

    return { valid: true, newMove };
  }

  getMoveChain() {
    return Array.from(this.moveChain);
  }
}
