let peer = null;
let conn = null;
let isHost = false;
let gameMode = null;
window.ephemeralWallet = null; // Store the ephemeral wallet globally

async function selectMode(mode) {
  gameMode = mode;
  document.getElementById('mode-select').style.display = 'none';

  if (mode === 'wallet') {
    try {
      // 1. Connect Wallet immediately
      const wallet = await connectWallet();
      if (!wallet) {
        alert('Failed to connect wallet. Please try again.');
        // Revert to mode selection if wallet connection fails
        document.getElementById('mode-select').style.display = 'block';
        document.getElementById('wallet-connect').style.display = 'none';
        return;
      }
      window.ephemeralWallet = wallet; // Store wallet globally

      // 2. Show the connection UI (host/join)
      document.getElementById('wallet-connect').style.display = 'block';

      // 3. Initialize PeerJS to get the ID and listen for connections
      initializePeer(wallet);

    } catch (error) {
        console.error('Wallet mode initialization error:', error);
        alert('Failed to initialize wallet mode. Please try again.');
        document.getElementById('mode-select').style.display = 'block';
        document.getElementById('wallet-connect').style.display = 'none';
    }
  } else {
    // Freeplay mode initialization
    document.getElementById('freeplay-connect').style.display = 'block';
    initializePeer(); // Initialize without wallet for freeplay
  }
}

function showWalletTooltip(element) {
  const tooltip = element.querySelector('.tooltip');
  tooltip.style.visibility = 'visible';
  setTimeout(() => {
    tooltip.style.visibility = 'hidden';
  }, 3000);
}

// Initialize networking when the game loads
window.addEventListener('load', () => {
  // Show mode selection by default
  document.getElementById('mode-select').style.display = 'block';
});

// Removed checkWalletAndInit and initializeNetworking as they are replaced by the new selectMode flow

function initializePeer(wallet = null) {
    // Use wallet address prefix for ID in wallet mode, random for freeplay
    const peerId = wallet ? `crypto-${wallet.address.slice(2, 12)}` : `free-${Math.random().toString(36).substr(2, 9)}`;
    
    // Configure PeerJS with ICE servers for better connectivity
    const peerConfig = {
        debug: 2, // 0 = no logs, 1 = errors only, 2 = warnings + errors, 3 = all logs
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                {
                    urls: 'turn:numb.viagenie.ca',
                    credential: 'muazkh',
                    username: 'webrtc@live.com'
                }
            ]
        }
    };
    
    // Show connecting status
    document.getElementById('peer-id-display').innerHTML = `
        <p>Connecting to network...</p>
        <div style="width: 20px; height: 20px; margin: 10px auto; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    `;
    
    // Determine which container to update based on mode
    const displayContainerId = gameMode === 'wallet' ? 'wallet-connect' : 'freeplay-connect';
    const peerDisplayElement = document.querySelector(`#${displayContainerId} #peer-id-display`);
    const connectionStatusElement = document.querySelector(`#${displayContainerId} #connection-status`);

    if (peerDisplayElement) {
        peerDisplayElement.innerHTML = `
            <p>Connecting to network...</p>
            <div style="width: 20px; height: 20px; margin: 10px auto; border: 3px solid #f3f3f3; border-top: 3px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        `;
    }

    peer = new Peer(peerId, peerConfig);

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        if (peerDisplayElement) {
             if (wallet) {
                 peerDisplayElement.innerHTML = `
                    <p>Wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}</p>
                    <p>Your game ID: <span style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px; cursor: pointer;" onclick="copyPeerId(this.parentNode)" title="Click to copy game ID">${id}</span></p>
                    <div id="copy-tooltip" style="position: absolute; background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 4px; font-size: 12px; bottom: 100%; left: 50%; transform: translateX(-50%); display: none; white-space: nowrap;">
                      Copied!
                    </div>
                 `;
             } else {
                 peerDisplayElement.innerHTML = `
                    <p>Your game ID: <span style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px; cursor: pointer;" onclick="copyPeerId(this.parentNode)" title="Click to copy game ID">${id}</span></p>
                     <div id="copy-tooltip" style="position: absolute; background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 4px; font-size: 12px; bottom: 100%; left: 50%; transform: translateX(-50%); display: none; white-space: nowrap;">
                       Copied!
                     </div>
                 `;
             }
        }
        if (connectionStatusElement) {
            connectionStatusElement.textContent = 'Waiting for connection...';
            connectionStatusElement.style.color = '#aaa';
        }

        // Don't show player yet, wait for connection
        // gameState.player1Connected = true;
        // player.show();
    });

    // Listen for incoming connections (acts as host)
    peer.on('connection', (connection) => {
        console.log("Incoming connection received.");
        if (conn && conn.open) {
            console.warn("Already connected to a peer. Rejecting new connection.");
            connection.close();
            return;
        }
        conn = connection;
        isHost = true; // The one receiving the connection is the host
        handleConnection(); // Set up handlers for the established connection
    });
    
    // Error handling
    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        let errorMessage = 'Connection error';
        
        if (err.type === 'peer-unavailable') {
            errorMessage = 'Game ID not found. Check the ID and try again.';
        } else if (err.type === 'network') {
            errorMessage = 'Network error. Check your connection.';
        } else if (err.type === 'disconnected') {
            errorMessage = 'Disconnected from server. Trying to reconnect...';
            // Try to reconnect
            peer.reconnect();
        }
        
        // Display error to user
        document.getElementById('peer-id-display').innerHTML += `
            <p style="color: #ff6b6b; margin-top: 10px;">${errorMessage}</p>
        `;
    });
    
    // Handle disconnection
    peer.on('disconnected', () => {
        console.log('PeerJS disconnected. Attempting to reconnect...');
        document.getElementById('peer-id-display').innerHTML += `
            <p style="color: #ffcc00; margin-top: 10px;">Connection lost. Reconnecting...</p>
        `;
        peer.reconnect();
    });
}

function connectToPeer() {
    // Determine which input/button to use based on mode
    const containerId = gameMode === 'wallet' ? 'wallet-connect' : 'freeplay-connect';
    const peerIdInput = document.querySelector(`#${containerId} #peer-id-input`);
    const joinButton = document.querySelector(`#${containerId} button[onclick="connectToPeer()"]`); // Target specific button

    if (!peerIdInput || !joinButton) {
        console.error("Could not find connection elements for mode:", gameMode);
        alert("UI error: Could not find connection elements.");
        return;
    }

    const peerId = peerIdInput.value.trim();

    if (!peerId) {
        alert('Please enter a valid Game ID');
        return;
    }

    if (!peer || peer.disconnected) {
        alert('Not connected to the signaling server. Please refresh.');
        return;
    }

    // Show connecting status
    const originalText = joinButton.textContent;
    joinButton.innerHTML = 'Connecting... <div style="width: 10px; height: 10px; display: inline-block; margin-left: 5px; border: 2px solid #f3f3f3; border-top: 2px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite;"></div>';
    joinButton.disabled = true;
    
    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
        if (!conn || !conn.open) {
            joinButton.textContent = originalText;
            joinButton.disabled = false;
            alert('Connection timed out. The other player may be offline or behind a firewall.');
        }
    }, 15000); // 15 second timeout
    
    try {
        conn = peer.connect(peerId, {
            reliable: true,
            serialization: 'json'
        });
        
        if (!conn) {
            throw new Error('Failed to create connection');
        }
        
        conn.on('error', (err) => {
            console.error('Connection error:', err);
            clearTimeout(connectionTimeout);
            joinButton.textContent = originalText;
            joinButton.disabled = false;
            alert('Connection error: ' + err.message);
        });

        isHost = false; // The one initiating the connection is the client
        handleConnection(); // Set up handlers for the established connection

        // Reset button text after successful connection attempt starts
        conn.on('open', () => {
            clearTimeout(connectionTimeout);
            joinButton.textContent = 'Connected!';
        });
    } catch (err) {
        console.error('Error connecting to peer:', err);
        clearTimeout(connectionTimeout);
        joinButton.textContent = originalText;
        joinButton.disabled = false;
        alert('Error connecting: ' + err.message);
    }
}

function copyPeerId(element) {
    const idText = element.querySelector('span').textContent;
    navigator.clipboard.writeText(idText).then(() => {
        // Visual feedback
        const span = element.querySelector('span');
        const tooltip = document.getElementById('copy-tooltip');
        const originalBg = span.style.background;
        
        // Show copied feedback
        span.style.background = 'rgba(255,255,255,0.3)';
        tooltip.style.display = 'block';
        
        // Reset after delay
        setTimeout(() => {
            span.style.background = originalBg;
            tooltip.style.display = 'none';
        }, 1000);
    });
}

function handleConnection() {
    // Set up connection event handlers
    conn.on('open', () => {
        console.log('Connection established successfully');
        document.getElementById('auth-container').style.display = 'none';
        
        // Initialize move sync with host status
        // Initialize move sync and player states
        gameState.moveSync.initGame(isHost);

        // Set initial player visibility and orientation
        if (isHost) {
            // Host setup (Player 1)
            gameState.player1Connected = true;
            player.show();
            player.facingLeft = false;
            player.switchSprite('idle');
            player2.facingLeft = true; // Opponent faces left
            player2.switchSprite('idle');

            gameState.player1Connected = true; // Local player
            player.show();
            gameState.player2Connected = true; // Remote player
            player2.show();

            // Initialize SignedMoveManager if in wallet mode
            if (gameMode === 'wallet' && window.ephemeralWallet) {
                initSignedMoveManager(window.ephemeralWallet.address);
            }

            // Tell the other peer they are player 2 (client)
            conn.send({ type: 'playerAssignment', assignment: 'player2' });

            // Host starts the countdown
            startCountdown();

        } else {
            // Client setup (Player 2)
            player.facingLeft = false; // Opponent faces right
            player.switchSprite('idle');
            player2.facingLeft = true;
            player2.switchSprite('idle');

            gameState.player1Connected = true; // Remote player
            player.show();
            gameState.player2Connected = true; // Local player
            player2.show();

             // Initialize SignedMoveManager if in wallet mode
            if (gameMode === 'wallet' && window.ephemeralWallet) {
                // Client uses their own wallet address for their manager
                initSignedMoveManager(window.ephemeralWallet.address);
            }
            // Client waits for countdown start signal (handled in 'playerAssignment')
        }

        // Start ping/pong and status updates for both host and client *after* connection is open
        startPingPong();
        startConnectionStatusUpdates();
    }); // End of conn.on('open')

    // }); // REMOVED extra closing brace that was here

    conn.on('data', (data) => {
        try {
            if (data.type === 'playerAssignment' && data.assignment === 'player2' && !isHost) {
                // Client receives assignment and starts countdown
                console.log("Assigned as Player 2 by host.");
                startCountdown();
            } else if (data.type === 'ping' || data.type === 'pong') {
                handlePingPong(data);
            } else if (gameMode === 'wallet') {
                // Wallet mode uses move validation
                handleWalletGameData(data);
            } else {
                // Free play mode - simple data passing
                handleFreePlayData(data);
            }
        } catch (err) {
            console.error('Error handling data:', err, data);
        }
    });
    
    // Handle connection errors
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        alert('Connection error: ' + err.message);
    });
    
    // Handle connection close
    conn.on('close', () => {
        console.log('Connection closed');
        
        // Show reconnect option
        document.getElementById('auth-container').style.display = 'block';
        document.getElementById('auth-container').innerHTML = `
            <p style="color: white; margin-bottom: 20px;">Connection lost</p>
            <button onclick="location.reload()" style="padding: 10px; font-family: 'Press Start 2P', cursive; min-width: 200px;">
                Reconnect
            </button>
        `;
    }); // End of conn.on('close')
} // End of handleConnection function

// Sends the current player state (either raw or signed depending on mode)
async function sendPlayerState(player) {
    if (!conn || !conn.open) return;

    try {
        let dataToSend;

        if (gameMode === 'wallet') {
            // --- Wallet Mode: Create and send SignedGameState ---
            if (!gameState.signedMoveManager) {
                console.error("SignedMoveManager not initialized for wallet mode.");
                return;
            }

            const wallet = await getEphemeralWallet();
            if (!wallet) {
                console.error("Ephemeral wallet not available for signing.");
                // Maybe alert the user or attempt re-authentication?
                return;
            }

            // Create a snapshot of the player's current state
            // Note: We still use moveSync to *get* the state structure easily,
            // but the history/sequence there isn't the primary source of truth for wallet mode.
            const currentStateSnapshot = {
                position: { ...player.position },
                velocity: { ...player.velocity },
                health: player.health,
                facingLeft: player.facingLeft,
                isAttacking: player.isAttacking,
                // Ensure currentSprite is captured correctly
                currentSprite: player.image === player.sprites.idle.image ? 'idle' :
                               player.image === player.sprites.run.image ? 'run' :
                               player.image === player.sprites.jump.image ? 'jump' :
                               player.image === player.sprites.fall.image ? 'fall' :
                               player.image === player.sprites.attack1.image ? 'attack1' :
                               player.image === player.sprites.takeHit.image ? 'takeHit' :
                               player.image === player.sprites.death.image ? 'death' : 'idle',
                dead: player.dead,
                // timestamp added by SignedGameState constructor
            };

            // Create and sign the state using the manager
            const signedState = await gameState.signedMoveManager.createAndSignLocalState(
                currentStateSnapshot,
                wallet
            );

            // Send the entire SignedGameState object
            dataToSend = {
                type: 'signedGameState', // Use a distinct type
                signedState: signedState
            };

        } else {
            // --- Free Play Mode: Send raw player state ---
            // Update local state in moveSync (also adds to history for playback)
            const playerState = gameState.moveSync.updateLocalState(player);

            dataToSend = {
                type: 'playerState',
                state: playerState
            };
        }

        // Send the prepared data
        conn.send(dataToSend);

    } catch (err) {
        console.error(`Error sending player state (${gameMode} mode):`, err);
        // If we get an error sending data, check connection
        if (!conn.open) {
            console.log('Connection appears closed, attempting to reconnect');
            // Connection might be closed, show reconnect option
            document.getElementById('auth-container').style.display = 'block';
            document.getElementById('auth-container').innerHTML = `
                <p style="color: white; margin-bottom: 20px;">Connection lost</p>
                <button onclick="location.reload()" style="padding: 10px; font-family: 'Press Start 2P', cursive; min-width: 200px;">
                    Reconnect
                </button>
            `;
        }
    }
}


// Handle data for free play mode
function handleFreePlayData(data) {
    // Check if this is a player state packet
    if (data.type === 'playerState' && data.state) {
        // Process the received player state
        const success = gameState.moveSync.processRemoteState(data.state);
        
        if (success) {
            // Apply state to opponent player
            applyRemoteState();
        }
        return;
    }
    
    // Legacy direct state update (fallback)
    const opponentPlayer = isHost ? player2 : player;
    
    // Update position if provided
    if (data.position) {
        opponentPlayer.position.x = data.position.x;
        opponentPlayer.position.y = data.position.y;
    }
    
    // Update velocity
    if (data.velocity) {
        opponentPlayer.velocity.x = data.velocity.x;
        opponentPlayer.velocity.y = data.velocity.y;
    }
    
    // Update facing direction
    if (data.facingLeft !== undefined) {
        opponentPlayer.facingLeft = data.facingLeft;
    }
    
    // Update sprite state
    if (data.spriteState) {
        opponentPlayer.switchSprite(data.spriteState);
    }
    
    // Handle attacking
    if (data.isAttacking && !opponentPlayer.isAttacking) {
        opponentPlayer.attack();
    }
    
    // Handle health updates - only allow health to decrease, never increase
    if (data.health !== undefined && data.health < opponentPlayer.health) {
        opponentPlayer.health = data.health;
        const healthBar = isHost ? '#player2Health' : '#playerHealth';
        gsap.to(healthBar, {width: opponentPlayer.health + '%'});
        
        if (data.health <= 0 && !opponentPlayer.dead) {
            opponentPlayer.switchSprite('death');
            opponentPlayer.dead = true;
        }
    }
}

// Apply remote player state to the opponent
function applyRemoteState() {
    const opponentPlayer = isHost ? player2 : player;
    const remoteState = gameState.moveSync.remotePlayerState;
    
    // Update position
    opponentPlayer.position.x = remoteState.position.x;
    opponentPlayer.position.y = remoteState.position.y;
    
    // Update velocity
    opponentPlayer.velocity.x = remoteState.velocity.x;
    opponentPlayer.velocity.y = remoteState.velocity.y;
    
    // Update facing direction
    opponentPlayer.facingLeft = remoteState.facingLeft;
    
    // Update sprite
    if (remoteState.currentSprite && opponentPlayer.currentSprite !== remoteState.currentSprite) {
        opponentPlayer.switchSprite(remoteState.currentSprite);
        opponentPlayer.currentSprite = remoteState.currentSprite;
    }
    
    // Handle attacking
    if (remoteState.isAttacking && !opponentPlayer.isAttacking) {
        opponentPlayer.attack();
    }
    
    // Handle health updates
    if (remoteState.health < opponentPlayer.health) {
        opponentPlayer.health = remoteState.health;
        const healthBar = isHost ? '#player2Health' : '#playerHealth';
        gsap.to(healthBar, {width: opponentPlayer.health + '%'});
        
        if (remoteState.health <= 0 && !opponentPlayer.dead) {
            opponentPlayer.switchSprite('death');
            opponentPlayer.dead = true;
        }
    }
}

// This function is no longer needed as we're using direct state synchronization

// Handle incoming signed game state data in wallet mode
function handleWalletGameData(data) {
    if (data.type !== 'signedGameState' || !data.signedState) {
        console.warn("Received unexpected data format in wallet mode:", data);
        return;
    }

    if (!gameState.signedMoveManager) {
        console.error("SignedMoveManager not initialized. Cannot process wallet game data.");
        return;
    }

    // Validate the incoming signed state using the manager
    const validationResult = gameState.signedMoveManager.validateAndStoreRemoteState(data.signedState);

    if (!validationResult.valid) {
        console.error(`Invalid remote state received: ${validationResult.reason}`, data.signedState);
        // TODO: Handle invalid state (e.g., alert user, potentially disconnect or flag for dispute)
        alert(`Invalid game state received from opponent: ${validationResult.reason}. Gameplay might be compromised.`);
        // For now, we'll stop processing this invalid state.
        return;
    }

    // --- State is valid, apply it to the opponent's character ---
    const opponentPlayer = isHost ? player2 : player;
    const validatedRemoteState = validationResult.state; // The validated SignedGameState object

    try {
        // Parse the state JSON string from the validated move data
        const remotePlayerState = JSON.parse(validatedRemoteState.move.state);

        // Apply the parsed state (similar logic to applyRemoteState)
        opponentPlayer.position.x = remotePlayerState.position.x;
        opponentPlayer.position.y = remotePlayerState.position.y;
        opponentPlayer.velocity.x = remotePlayerState.velocity.x;
        opponentPlayer.velocity.y = remotePlayerState.velocity.y;
        opponentPlayer.facingLeft = remotePlayerState.facingLeft;

        // Update sprite if changed
        if (remotePlayerState.currentSprite && opponentPlayer.currentSprite !== remotePlayerState.currentSprite) {
            opponentPlayer.switchSprite(remotePlayerState.currentSprite);
            opponentPlayer.currentSprite = remotePlayerState.currentSprite; // Keep track locally
        }

        // Handle attacking state
        // Check if the remote state *is* attacking, and our local representation *isn't*
        if (remotePlayerState.isAttacking && !opponentPlayer.isAttacking) {
             // Trigger the attack animation locally. The actual hit detection still happens client-side based on timing.
             opponentPlayer.attack();
        }
        // Note: We might not need to explicitly set opponentPlayer.isAttacking = remotePlayerState.isAttacking
        // because the attack() method and animation frames handle the attack duration.
        // However, if desync occurs, explicitly setting it might be needed, but could cause visual glitches. Let's omit for now.

        // Handle health updates (only apply if health decreased)
        if (remotePlayerState.health < opponentPlayer.health) {
            opponentPlayer.health = remotePlayerState.health;
            const healthBarId = isHost ? '#player2Health' : '#playerHealth';
            gsap.to(healthBarId, { width: opponentPlayer.health + '%' });

            // Handle death state based on health
            if (remotePlayerState.health <= 0 && !opponentPlayer.dead) {
                 // Check the 'dead' flag from the remote state as well
                 if (remotePlayerState.dead) {
                    opponentPlayer.switchSprite('death');
                    opponentPlayer.dead = true;
                 } else {
                     // If remote state says health is 0 but not dead yet, trigger takeHit locally
                     // This might happen due to network latency.
                     opponentPlayer.takeHit();
                 }
            }
        }

        // Handle explicit death state from remote (if health didn't trigger it)
        if (remotePlayerState.dead && !opponentPlayer.dead) {
             opponentPlayer.switchSprite('death');
             opponentPlayer.dead = true;
        }

    } catch (error) {
        console.error("Error parsing or applying remote player state:", error, validatedRemoteState);
    }
}
