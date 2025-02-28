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
    // Create typed data for signing
    const domain = {
      name: 'CryptoFighter',
      version: '1',
      chainId: 1, // Replace with actual chain ID
    };

    const types = {
      GameMove: [
        { name: 'playerId', type: 'address' },
        { name: 'prevHash', type: 'string' },
        { name: 'keyCode', type: 'string' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'sequence', type: 'uint256' }
      ]
    };

    // Sign with EIP-712
    this.signature = await wallet._signTypedData(domain, types, this.move);
    this.calculateHash();
    return this;
  }

  calculateHash() {
    // Use ethers.js utils to hash the move data
    const data = ethers.utils.defaultAbiCoder.encode(
      ['address', 'string', 'string', 'uint256', 'uint256', 'bytes'],
      [
        this.move.playerId,
        this.move.prevHash,
        this.move.keyCode,
        this.move.timestamp,
        this.move.sequence,
        this.signature || '0x'
      ]
    );
    this.hash = ethers.utils.keccak256(data);
    return this.hash;
  }

  verify() {
    try {
      const domain = {
        name: 'CryptoFighter',
        version: '1',
        chainId: 1, // Replace with actual chain ID
      };

      const types = {
        GameMove: [
          { name: 'playerId', type: 'address' },
          { name: 'prevHash', type: 'string' },
          { name: 'keyCode', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'sequence', type: 'uint256' }
        ]
      };

      // Verify EIP-712 signature
      const recoveredAddr = ethers.utils.verifyTypedData(
        domain,
        types,
        this.move,
        this.signature
      );
      return recoveredAddr.toLowerCase() === this.move.playerId.toLowerCase();
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

  async createMove(keyCode, wallet) {
    const lastMove = Array.from(this.moveChain).pop();
    const prevHash = lastMove ? lastMove.hash : this.genesisHash;
    const move = new GameMove(this.playerId, prevHash, keyCode, Date.now());
    move.move.sequence = ++this.sequence;
    // Sign the move before returning
    await move.sign(wallet);
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
