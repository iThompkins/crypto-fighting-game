// Represents a single signed game state snapshot
class SignedGameState {
  constructor(playerId, playerPrevHash, opponentPrevHash, state, timestamp) {
    this.move = {
      playerId: playerId,         // Address of the player making the move
      playerPrevHash: playerPrevHash, // Hash of this player's previous move
      opponentPrevHash: opponentPrevHash, // Hash of the opponent's last validated move
      state: JSON.stringify(state), // Player state snapshot (JSON string for consistency)
      timestamp: timestamp,       // Timestamp of the move
      sequence: 0                 // Sequence number for this player
    };
    this.signature = null;        // EIP-712 signature
    this.hash = null;             // Keccak256 hash of the signed move data
  }

  async sign(wallet) {
    if (!wallet) {
      throw new Error("Wallet is required for signing.");
    }
    // Create typed data for EIP-712 signing
    const domain = {
      name: 'CryptoFighter',
      version: '1',
      chainId: 1, // TODO: Replace with actual chain ID if deploying
      verifyingContract: '0x0000000000000000000000000000000000000000' // TODO: Replace if using a contract
    };

    // Define the EIP-712 type structure
    const types = {
      SignedGameState: [
        { name: 'playerId', type: 'address' },
        { name: 'playerPrevHash', type: 'bytes32' },
        { name: 'opponentPrevHash', type: 'bytes32' },
        { name: 'state', type: 'string' }, // Keep as string to match JSON.stringify
        { name: 'timestamp', type: 'uint256' },
        { name: 'sequence', type: 'uint256' }
      ]
    };

    try {
      // Sign the structured data
      this.signature = await wallet._signTypedData(domain, types, this.move);
      this.calculateHash(); // Calculate hash after signing
      return this;
    } catch (error) {
      console.error("Error signing game state:", error);
      throw error;
    }
  }

  // Calculates the Keccak256 hash of the signed move data
  calculateHash() {
    if (!this.signature) {
      console.warn("Calculating hash before signing. Signature will be empty.");
    }
    // Encode the data structure for hashing according to EIP-712 convention
    // Note: We hash the *signed* data including the signature
    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'address', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256', 'bytes'],
      [
        ethers.utils.id("SignedGameState(address playerId,bytes32 playerPrevHash,bytes32 opponentPrevHash,string state,uint256 timestamp,uint256 sequence)"), // Type hash
        this.move.playerId,
        this.move.playerPrevHash,
        this.move.opponentPrevHash,
        ethers.utils.id(this.move.state), // Hash the string state
        this.move.timestamp,
        this.move.sequence,
        this.signature || '0x' // Include signature in hash
      ]
    );
    this.hash = ethers.utils.keccak256(encodedData);
    return this.hash;
  }

  // Verifies the EIP-712 signature
  verifySignature() {
    if (!this.signature) return false;
    try {
      const domain = {
        name: 'CryptoFighter',
        version: '1',
        chainId: 1, // TODO: Replace with actual chain ID
        verifyingContract: '0x0000000000000000000000000000000000000000' // TODO: Replace if using a contract
      };

      const types = {
        SignedGameState: [
          { name: 'playerId', type: 'address' },
          { name: 'playerPrevHash', type: 'bytes32' },
          { name: 'opponentPrevHash', type: 'bytes32' },
          { name: 'state', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'sequence', type: 'uint256' }
        ]
      };

      // Verify the signature against the move data
      const recoveredAddr = ethers.utils.verifyTypedData(
        domain,
        types,
        this.move, // Use the raw move data for verification
        this.signature
      );
      
      // Compare recovered address with the playerId in the move
      return recoveredAddr.toLowerCase() === this.move.playerId.toLowerCase();
    } catch (e) {
      console.error('Signature verification failed:', e);
      return false;
    }
  }

}


// Manages the chain of signed game states for both players
class SignedMoveManager {
  constructor(localPlayerId, genesisHash = ethers.constants.HashZero) {
    this.localPlayerId = localPlayerId; // Address of the local ephemeral wallet
    this.genesisHash = genesisHash;     // Starting hash for the chains

    // Store moves keyed by their hash for efficient lookup
    this.localMoves = new Map(); // Map<hash, SignedGameState>
    this.remoteMoves = new Map(); // Map<hash, SignedGameState>
    
    this.lastLocalMoveHash = this.genesisHash;
    this.lastRemoteMoveHash = this.genesisHash;
    
    this.localSequence = 0;
    this.remoteSequence = 0; // Track expected sequence from remote
  }

  // Creates, signs, and stores a new local game state
  async createAndSignLocalState(state, wallet) {
    if (!wallet || wallet.address.toLowerCase() !== this.localPlayerId.toLowerCase()) {
        throw new Error("Invalid wallet provided for signing local state.");
    }
    
    const timestamp = Date.now();
    const sequence = ++this.localSequence;
    
    // Create the state object, linking to previous local and remote hashes
    const signedState = new SignedGameState(
      this.localPlayerId,
      this.lastLocalMoveHash,
      this.lastRemoteMoveHash, // Include opponent's last known hash
      state,
      timestamp
    );
    signedState.move.sequence = sequence;

    // Sign the state
    await signedState.sign(wallet);
    
    // Store and update last hash
    this.localMoves.set(signedState.hash, signedState);
    this.lastLocalMoveHash = signedState.hash;
    
    console.log(`Created local move #${sequence}, hash: ${signedState.hash.substring(0, 10)}...`);
    return signedState;
  }

  // Validates and stores an incoming remote game state
  validateAndStoreRemoteState(signedState) {
    // 0. Reconstruct the object if it's plain JSON
    // (PeerJS might serialize/deserialize, losing the class instance methods)
    let remoteState = Object.assign(new SignedGameState(null, null, null, null, null), signedState);
    remoteState.move = signedState.move; // Ensure nested object is also assigned

    // 1. Verify Signature
    if (!remoteState.verifySignature()) {
      console.error("Invalid signature on remote state:", remoteState);
      return { valid: false, reason: 'Invalid signature' };
    }
    
    // 2. Verify Player ID (should not be the local player)
    if (remoteState.move.playerId.toLowerCase() === this.localPlayerId.toLowerCase()) {
      console.error("Remote state has local player ID:", remoteState);
      return { valid: false, reason: 'Remote state signed by local player' };
    }

    // 3. Verify Sequence Number (should be the next expected sequence)
    const expectedRemoteSequence = this.remoteSequence + 1;
    if (remoteState.move.sequence !== expectedRemoteSequence) {
      console.error(`Invalid remote sequence. Expected ${expectedRemoteSequence}, got ${remoteState.move.sequence}`);
      return { valid: false, reason: `Invalid sequence number. Expected ${expectedRemoteSequence}` };
    }

    // 4. Verify Hash Calculation (ensure hash matches recalculated hash)
    // Recalculate hash based on received data to prevent tampering
    const recalculatedHash = remoteState.calculateHash();
    if (remoteState.hash !== recalculatedHash) {
        console.error(`Remote state hash mismatch. Received: ${remoteState.hash}, Recalculated: ${recalculatedHash}`);
        return { valid: false, reason: 'Hash mismatch' };
    }

    // 5. Verify Player's Previous Hash
    // The playerPrevHash in the remote state should match the hash of *their* previous move
    if (remoteState.move.playerPrevHash !== this.lastRemoteMoveHash) {
      console.error(`Invalid remote playerPrevHash. Expected ${this.lastRemoteMoveHash}, got ${remoteState.move.playerPrevHash}`);
      return { valid: false, reason: 'Invalid player previous hash link' };
    }

    // 6. Verify Opponent's Previous Hash (Crucial Link!)
    // The opponentPrevHash in the remote state should match the hash of *our* last move
    if (remoteState.move.opponentPrevHash !== this.lastLocalMoveHash) {
      // This is tricky - network latency means our lastLocalMoveHash might be ahead.
      // We should check if the opponentPrevHash matches *any* of our recent local move hashes.
      // For simplicity now, we'll allow a slight mismatch but log a warning.
      // A more robust solution might involve acknowledging received hashes.
      if (!this.localMoves.has(remoteState.move.opponentPrevHash)) {
         console.warn(`Potential desync? Remote state's opponentPrevHash (${remoteState.move.opponentPrevHash.substring(0,10)}...) doesn't match our last local hash (${this.lastLocalMoveHash.substring(0,10)}...). Checking history...`);
         // Allow if it matches any known local hash (simple check)
         if (!this.localMoves.has(remoteState.move.opponentPrevHash)) {
            console.error(`Fatal desync: opponentPrevHash ${remoteState.move.opponentPrevHash} not found in local history.`);
            return { valid: false, reason: 'Invalid opponent previous hash link (desync)' };
         }
         console.log("Accepted remote state referencing an older local hash.");
      }
    }

    // All checks passed! Store the valid remote state.
    this.remoteMoves.set(remoteState.hash, remoteState);
    this.lastRemoteMoveHash = remoteState.hash;
    this.remoteSequence = remoteState.move.sequence; // Update expected sequence

    console.log(`Validated remote move #${remoteState.move.sequence}, hash: ${remoteState.hash.substring(0, 10)}...`);
    return { valid: true, state: remoteState }; // Return the validated state object
  }

  // Get the combined, ordered history of moves
  getCombinedHistory() {
    const combined = [...this.localMoves.values(), ...this.remoteMoves.values()];
    // Sort primarily by timestamp, then sequence as a tie-breaker
    combined.sort((a, b) => {
        if (a.move.timestamp !== b.move.timestamp) {
            return a.move.timestamp - b.move.timestamp;
        }
        // If timestamps are identical, use sequence (lower sequence first)
        return a.move.sequence - b.move.sequence; 
    });
    return combined;
  }
}
