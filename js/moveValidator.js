// Represents a single signed player input
class SignedInput { // Renamed class
  constructor(playerId, playerPrevHash, opponentPrevHash, input, timestamp) {
    this.inputData = { // Renamed 'move' to 'inputData' for clarity
      playerId: playerId,         // Address of the PLAYER wallet making the input
      playerPrevHash: playerPrevHash, // Hash of this player's previous input
      opponentPrevHash: opponentPrevHash, // Hash of the opponent's last validated input
      input: JSON.stringify(input), // The input action, e.g., { key: 'w', type: 'keydown' }
      timestamp: timestamp,       // Timestamp of the input event
      sequence: 0                 // Sequence number for this player
    };
    this.signature = null;        // EIP-712 signature
    this.hash = null;             // Keccak256 hash of the signed input data
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

    // Define the EIP-712 type structure for SignedInput
    const types = {
      SignedInput: [ // Renamed type
        { name: 'playerId', type: 'address' },
        { name: 'playerPrevHash', type: 'bytes32' },
        { name: 'opponentPrevHash', type: 'bytes32' },
        { name: 'input', type: 'string' }, // JSON string of the input object
        { name: 'timestamp', type: 'uint256' },
        { name: 'sequence', type: 'uint256' }
      ]
    };

    try {
      // Sign the structured data (using this.inputData)
      // Use the public signTypedData method
      this.signature = await wallet.signTypedData(domain, types, this.inputData);
      this.calculateHash(); // Calculate hash after signing
      return this;
    } catch (error) {
      console.error("Error signing input:", error);
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
        ethers.utils.id("SignedInput(address playerId,bytes32 playerPrevHash,bytes32 opponentPrevHash,string input,uint256 timestamp,uint256 sequence)"), // Type hash for SignedInput
        this.inputData.playerId,
        this.inputData.playerPrevHash,
        this.inputData.opponentPrevHash,
        ethers.utils.id(this.inputData.input), // Hash the stringified input
        this.inputData.timestamp,
        this.inputData.sequence,
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
        SignedInput: [ // Renamed type
          { name: 'playerId', type: 'address' },
          { name: 'playerPrevHash', type: 'bytes32' },
          { name: 'opponentPrevHash', type: 'bytes32' },
          { name: 'input', type: 'string' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'sequence', type: 'uint256' }
        ]
      };

      // Verify the signature against the input data
      const recoveredAddr = ethers.utils.verifyTypedData(
        domain,
        types,
        this.inputData, // Use the raw input data for verification
        this.signature
      );

      // Compare recovered address with the playerId in the input data
      return recoveredAddr.toLowerCase() === this.inputData.playerId.toLowerCase();
    } catch (e) {
      console.error('Signature verification failed:', e);
      return false;
    }
  }

}


// Manages the chain of signed inputs for both players
class SignedInputManager { // Renamed class
  constructor(localPlayerId, genesisHash = ethers.constants.HashZero) {
    this.localPlayerId = localPlayerId; // Address of the local ephemeral PLAYER wallet
    this.genesisHash = genesisHash;     // Starting hash for the input chains

    // Store inputs keyed by their hash for efficient lookup
    this.localInputs = new Map(); // Map<hash, SignedInput> Renamed
    this.remoteInputs = new Map(); // Map<hash, SignedInput> Renamed

    this.lastLocalInputHash = this.genesisHash; // Renamed
    this.lastRemoteInputHash = this.genesisHash; // Renamed

    this.localSequence = 0;
    this.remoteSequence = 0; // Track expected sequence from remote
  }

  // Creates, signs, and stores a new local input event
  async createAndSignInput(input, wallet) { // Renamed method, takes input object
    if (!wallet || wallet.address.toLowerCase() !== this.localPlayerId.toLowerCase()) {
        throw new Error(`Invalid wallet provided for signing local input. Expected ${this.localPlayerId}, got ${wallet ? wallet.address : 'null'}`);
    }

    const timestamp = Date.now(); // Use event timestamp if available, else now
    const sequence = ++this.localSequence;

    // Create the input object, linking to previous local and remote input hashes
    const signedInput = new SignedInput(
      this.localPlayerId,
      this.lastLocalInputHash,   // Link to previous local input
      this.lastRemoteInputHash,  // Link to opponent's last known input
      input,                     // The actual input data { key, type }
      timestamp
    );
    signedInput.inputData.sequence = sequence;

    // Sign the input data
    await signedInput.sign(wallet);

    // Store and update last hash
    this.localInputs.set(signedInput.hash, signedInput);
    this.lastLocalInputHash = signedInput.hash;

    // console.log(`Created local input #${sequence} (${input.key} ${input.type}), hash: ${signedInput.hash.substring(0, 10)}...`);
    return signedInput;
  }

  // Validates and stores an incoming remote input event
  validateAndStoreRemoteInput(signedInput) { // Renamed method
    // 0. Reconstruct the object if it's plain JSON
    let remoteInput = Object.assign(new SignedInput(null, null, null, null, null), signedInput);
    remoteInput.inputData = signedInput.inputData; // Ensure nested object is assigned

    // 1. Verify Signature
    if (!remoteInput.verifySignature()) {
      console.error("Invalid signature on remote input:", remoteInput);
      return { valid: false, reason: 'Invalid signature' };
    }

    // 2. Verify Player ID (should not be the local player)
    if (remoteInput.inputData.playerId.toLowerCase() === this.localPlayerId.toLowerCase()) {
      console.error("Remote input has local player ID:", remoteInput);
      return { valid: false, reason: 'Remote input signed by local player' };
    }

    // 3. Verify Sequence Number (Allowing for potential out-of-order for now)
    const expectedRemoteSequence = this.remoteSequence + 1;
    if (remoteInput.inputData.sequence !== expectedRemoteSequence) {
      console.warn(`Out-of-order remote sequence. Expected ${expectedRemoteSequence}, got ${remoteInput.inputData.sequence}. Accepting for now.`);
      // TODO: Implement proper sequence handling if needed (e.g., buffering)
      if (remoteInput.inputData.sequence > this.remoteSequence) {
          this.remoteSequence = remoteInput.inputData.sequence; // Advance sequence if higher
      }
    } else {
        this.remoteSequence = remoteInput.inputData.sequence; // Update expected sequence normally
    }


    // 4. Verify Hash Calculation
    const recalculatedHash = remoteInput.calculateHash();
    if (remoteInput.hash !== recalculatedHash) {
        console.error(`Remote input hash mismatch. Received: ${remoteInput.hash}, Recalculated: ${recalculatedHash}`);
        return { valid: false, reason: 'Hash mismatch' };
    }

    // 5. Verify Player's Previous Hash (Allowing for potential out-of-order for now)
    // Find the input corresponding to the previous hash they sent
    const claimedPrevRemoteInput = this.remoteInputs.get(remoteInput.inputData.playerPrevHash);
    if (remoteInput.inputData.playerPrevHash !== this.genesisHash && !claimedPrevRemoteInput) {
         console.warn(`Remote input's playerPrevHash (${remoteInput.inputData.playerPrevHash.substring(0,10)}) not found in our history. Accepting for now.`);
         // TODO: Implement stricter hash chain validation if needed.
    }
    // Basic check: ensure the sequence number makes sense relative to the claimed previous input
    if (claimedPrevRemoteInput && remoteInput.inputData.sequence <= claimedPrevRemoteInput.inputData.sequence) {
        console.error(`Sequence number regression detected. Current: ${remoteInput.inputData.sequence}, Previous: ${claimedPrevRemoteInput.inputData.sequence}`);
        return { valid: false, reason: 'Sequence number regression' };
    }


    // 6. Verify Opponent's Previous Hash (Link to our actions)
    if (!this.localInputs.has(remoteInput.inputData.opponentPrevHash) && remoteInput.inputData.opponentPrevHash !== this.genesisHash) {
       console.warn(`Potential desync? Remote input's opponentPrevHash (${remoteInput.inputData.opponentPrevHash.substring(0,10)}...) not found in local history.`);
       // TODO: Implement stricter validation or acknowledgement mechanism.
       // return { valid: false, reason: 'Invalid opponent previous hash link (desync)' };
    }

    // All checks passed (or warnings issued)! Store the valid remote input.
    this.remoteInputs.set(remoteInput.hash, remoteInput);

    // Update lastRemoteInputHash *only* if this input is the highest sequence received so far
    // Note: This logic might need refinement if strict ordering is required.
    const currentLastRemote = this.remoteInputs.get(this.lastRemoteInputHash);
    if (!currentLastRemote || remoteInput.inputData.sequence > currentLastRemote.inputData.sequence) {
        this.lastRemoteInputHash = remoteInput.hash;
    }


    // console.log(`Validated remote input #${remoteInput.inputData.sequence}, hash: ${remoteInput.hash.substring(0, 10)}...`);
    return { valid: true, input: remoteInput }; // Return the validated input object
  }

  // Get the combined, ordered history of inputs
  getCombinedHistory() {
    const combined = [...this.localInputs.values(), ...this.remoteInputs.values()];
    // Sort primarily by timestamp, then sequence as a tie-breaker
    combined.sort((a, b) => {
        if (a.inputData.timestamp !== b.inputData.timestamp) {
            return a.inputData.timestamp - b.inputData.timestamp;
        }
        // If timestamps are identical, use sequence (lower sequence first)
        return a.inputData.sequence - b.inputData.sequence;
    });
    return combined;
  }
}
