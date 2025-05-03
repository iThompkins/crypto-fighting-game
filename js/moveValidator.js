// Represents a single signed player state
class SignedGameState { // Renamed to better reflect purpose
  constructor(playerId, playerPrevHash, opponentPrevHash, gameState, timestamp) {
    this.stateData = { // Renamed to stateData for clarity
      playerId: playerId,         // Address of the PLAYER wallet making the state update
      playerPrevHash: playerPrevHash, // Hash of this player's previous state
      opponentPrevHash: opponentPrevHash, // Hash of the opponent's last validated state
      state: JSON.stringify(gameState), // The complete game state including position, inputs, etc.
      timestamp: timestamp,       // Timestamp of the state update
      sequence: 0                 // Sequence number for this player
    };
    this.signature = null;        // EIP-712 signature
    this.hash = null;             // Keccak256 hash of the signed state data
  }

  async sign(wallet) { // Wallet should be the ephemeral PLAYER wallet
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

    // Define the EIP-712 type structure for SignedGameState
    const types = {
      SignedGameState: [ // Updated type name
        { name: 'playerId', type: 'address' },
        { name: 'playerPrevHash', type: 'bytes32' },
        { name: 'opponentPrevHash', type: 'bytes32' },
        { name: 'state', type: 'string' }, // JSON string of the complete game state
        { name: 'timestamp', type: 'uint256' },
        { name: 'sequence', type: 'uint256' }
      ]
    };

    try {
      // Sign the structured data (using this.stateData)
      this.signature = await wallet.signTypedData(domain, types, this.stateData);
      this.calculateHash(); // Calculate hash after signing
      return this;
    } catch (error) {
      console.error("Error signing game state:", error);
      throw error;
    }
  }

  // Calculates the Keccak256 hash of the signed state data
  calculateHash() {
    if (!this.signature) {
      console.warn("Calculating hash before signing. Signature will be empty.");
    }
    // Encode the data structure for hashing according to EIP-712 convention
    // Note: We hash the *signed* data including the signature
    const encodedData = ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'address', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256', 'bytes'],
      [
        ethers.utils.id("SignedGameState(address playerId,bytes32 playerPrevHash,bytes32 opponentPrevHash,string state,uint256 timestamp,uint256 sequence)"), // Updated type hash
        this.stateData.playerId,
        this.stateData.playerPrevHash,
        this.stateData.opponentPrevHash,
        ethers.utils.id(this.stateData.state), // Hash the stringified state
        this.stateData.timestamp,
        this.stateData.sequence,
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
        SignedGameState: [ // Updated type name
          { name: 'playerId', type: 'address' },
          { name: 'playerPrevHash', type: 'bytes32' },
          { name: 'opponentPrevHash', type: 'bytes32' },
          { name: 'state', type: 'string' }, // Updated field name
          { name: 'timestamp', type: 'uint256' },
          { name: 'sequence', type: 'uint256' }
        ]
      };

      // Verify the signature against the state data
      const recoveredAddr = ethers.utils.verifyTypedData(
        domain,
        types,
        this.stateData, // Use the raw state data for verification
        this.signature
      );

      // Compare recovered address with the playerId in the state data
      return recoveredAddr.toLowerCase() === this.stateData.playerId.toLowerCase();
    } catch (e) {
      console.error('Signature verification failed:', e);
      return false;
    }
  }

}


// Manages the chain of signed game states for both players
class SignedStateManager { // Renamed to better reflect purpose
  constructor(localPlayerId, genesisHash = ethers.constants.HashZero) {
    this.localPlayerId = localPlayerId; // Address of the local ephemeral PLAYER wallet
    this.genesisHash = genesisHash;     // Starting hash for the state chains

    // Store states keyed by their hash for efficient lookup
    this.localStates = new Map(); // Map<hash, SignedGameState>
    this.remoteStates = new Map(); // Map<hash, SignedGameState>

    this.lastLocalStateHash = this.genesisHash;
    this.lastRemoteStateHash = this.genesisHash;

    this.localSequence = 0;
    this.remoteSequence = 0; // Track expected sequence from remote
    
    // For state synchronization
    this.lastStateSyncTime = 0;
    this.stateSyncInterval = 1000 / 30; // 30 FPS
  }

  // Creates, signs, and stores a new local game state
  async createAndSignLocalState(gameState, wallet) {
    if (!wallet || wallet.address.toLowerCase() !== this.localPlayerId.toLowerCase()) {
        throw new Error(`Invalid wallet provided for signing local state. Expected ${this.localPlayerId}, got ${wallet ? wallet.address : 'null'}`);
    }

    const timestamp = Date.now();
    const sequence = ++this.localSequence;

    // Create the state object, linking to previous local and remote state hashes
    const signedState = new SignedGameState(
      this.localPlayerId,
      this.lastLocalStateHash,   // Link to previous local state
      this.lastRemoteStateHash,  // Link to opponent's last known state
      gameState,                 // The complete game state
      timestamp
    );
    signedState.stateData.sequence = sequence;

    // Sign the state data
    await signedState.sign(wallet);

    // Store and update last hash
    this.localStates.set(signedState.hash, signedState);
    this.lastLocalStateHash = signedState.hash;

    // Update last sync time
    this.lastStateSyncTime = timestamp;

    return signedState;
  }

  // Validates and stores an incoming remote game state
  validateAndStoreRemoteState(signedState) {
    // 0. Reconstruct the object if it's plain JSON
    let remoteState = Object.assign(new SignedGameState(null, null, null, null, null), signedState);
    remoteState.stateData = signedState.stateData; // Ensure nested object is assigned

    // 1. Verify Signature
    if (!remoteState.verifySignature()) {
      console.error("Invalid signature on remote state:", remoteState);
      return { valid: false, reason: 'Invalid signature' };
    }

    // 2. Verify Player ID (should not be the local player)
    if (remoteState.stateData.playerId.toLowerCase() === this.localPlayerId.toLowerCase()) {
      console.error("Remote state has local player ID:", remoteState);
      return { valid: false, reason: 'Remote state signed by local player' };
    }

    // 3. Verify Sequence Number (Allowing for potential out-of-order for now)
    const expectedRemoteSequence = this.remoteSequence + 1;
    if (remoteState.stateData.sequence !== expectedRemoteSequence) {
      console.warn(`Out-of-order remote sequence. Expected ${expectedRemoteSequence}, got ${remoteState.stateData.sequence}. Accepting for now.`);
      // TODO: Implement proper sequence handling if needed (e.g., buffering)
      if (remoteState.stateData.sequence > this.remoteSequence) {
          this.remoteSequence = remoteState.stateData.sequence; // Advance sequence if higher
      }
    } else {
        this.remoteSequence = remoteState.stateData.sequence; // Update expected sequence normally
    }

    // 4. Verify Hash Calculation
    const recalculatedHash = remoteState.calculateHash();
    if (remoteState.hash !== recalculatedHash) {
        console.error(`Remote state hash mismatch. Received: ${remoteState.hash}, Recalculated: ${recalculatedHash}`);
        return { valid: false, reason: 'Hash mismatch' };
    }

    // 5. Verify Player's Previous Hash (Allowing for potential out-of-order for now)
    // Find the state corresponding to the previous hash they sent
    const claimedPrevRemoteState = this.remoteStates.get(remoteState.stateData.playerPrevHash);
    if (remoteState.stateData.playerPrevHash !== this.genesisHash && !claimedPrevRemoteState) {
         console.warn(`Remote state's playerPrevHash (${remoteState.stateData.playerPrevHash.substring(0,10)}) not found in our history. Accepting for now.`);
         // TODO: Implement stricter hash chain validation if needed.
    }
    // Basic check: ensure the sequence number makes sense relative to the claimed previous state
    if (claimedPrevRemoteState && remoteState.stateData.sequence <= claimedPrevRemoteState.stateData.sequence) {
        console.error(`Sequence number regression detected. Current: ${remoteState.stateData.sequence}, Previous: ${claimedPrevRemoteState.stateData.sequence}`);
        return { valid: false, reason: 'Sequence number regression' };
    }

    // 6. Verify Opponent's Previous Hash (Link to our actions)
    if (!this.localStates.has(remoteState.stateData.opponentPrevHash) && remoteState.stateData.opponentPrevHash !== this.genesisHash) {
       console.warn(`Potential desync? Remote state's opponentPrevHash (${remoteState.stateData.opponentPrevHash.substring(0,10)}...) not found in local history.`);
       // TODO: Implement stricter validation or acknowledgement mechanism.
    }

    // All checks passed (or warnings issued)! Store the valid remote state.
    this.remoteStates.set(remoteState.hash, remoteState);

    // Update lastRemoteStateHash *only* if this state is the highest sequence received so far
    const currentLastRemote = this.remoteStates.get(this.lastRemoteStateHash);
    if (!currentLastRemote || remoteState.stateData.sequence > currentLastRemote.stateData.sequence) {
        this.lastRemoteStateHash = remoteState.hash;
    }

    return { valid: true, state: remoteState }; // Return the validated state object
  }

  // Get the combined, ordered history of states
  getCombinedHistory() {
    const combined = [...this.localStates.values(), ...this.remoteStates.values()];
    // Sort primarily by timestamp, then sequence as a tie-breaker
    combined.sort((a, b) => {
        if (a.stateData.timestamp !== b.stateData.timestamp) {
            return a.stateData.timestamp - b.stateData.timestamp;
        }
        // If timestamps are identical, use sequence (lower sequence first)
        return a.stateData.sequence - b.stateData.sequence;
    });
    return combined;
  }
  
  // Check if it's time to send a new state update
  shouldSyncState() {
    const now = Date.now();
    return now - this.lastStateSyncTime >= this.stateSyncInterval;
  }
}
