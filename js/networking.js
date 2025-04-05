let peer = null;
let conn = null;
let isHost = false;
let gameMode = null;
window.ephemeralWallet = null; // Store the ephemeral wallet globally

// --- Mock Contract Data ---
const MOCK_OPPONENT_ADDRESS = "0xb41188d9f36d4CF970605722d8071094e681eFFb".toLowerCase();
const MOCK_GAME_ID = "mockGame_PlayerVsFixedOpponent"; // Use a fixed ID for the single game

// Function to generate the single mock game data, assuming playerAddress is the creator
function getCreatorMockGameData(playerAddress) {
    if (!playerAddress) return null;
    return {
        gameId: MOCK_GAME_ID,
        creator: playerAddress.toLowerCase(),
        challenged: MOCK_OPPONENT_ADDRESS,
        status: 'ready' // Simplified status
    };
}

// Function to generate the game data if playerAddress is the challenged one
function getChallengedMockGameData(playerAddress) {
     if (!playerAddress || playerAddress.toLowerCase() !== MOCK_OPPONENT_ADDRESS) return null;
     // Need to know the creator's address - how? For mock, let's assume a fixed creator
     const MOCK_CREATOR_ADDRESS = "0xMockCreatorAddressPlaceholder...".toLowerCase(); // Replace if needed
     return {
        gameId: MOCK_GAME_ID,
        creator: MOCK_CREATOR_ADDRESS,
        challenged: playerAddress.toLowerCase(),
        status: 'ready'
     };
}


// In-memory store (less relevant now, but keep for structure)
let mockContractGames = []; // Will hold the dynamically generated game if needed

async function selectMode(mode) {
  gameMode = mode;
  document.getElementById('mode-select').style.display = 'none';
  const loadingOverlay = document.getElementById('wallet-loading-overlay');

  if (mode === 'wallet') {
    // Show loading overlay before starting wallet operations
    if (loadingOverlay) loadingOverlay.style.display = 'block';

    try {
      // 1. Connect Wallet immediately
      const wallet = await connectWallet(); // This handles generation/decryption
      if (!wallet) {
        throw new Error('Wallet connection failed or was cancelled.');
      }

      // Hide loading overlay after successful connection
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      }
      window.ephemeralWallet = wallet; // Store wallet globally
      console.log("Ephemeral Wallet Ready:", wallet.address);

      // Update UI with wallet address
      const walletDisplay = document.getElementById('wallet-address-display');
      if (walletDisplay) {
          walletDisplay.textContent = `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`;
      }

      // 2. Show the game list/creation UI
      document.getElementById('wallet-connect').style.display = 'block';

      // 3. Fetch and display the player's games
      await displayGameList();

      // Note: PeerJS is NOT initialized here anymore. It's initialized
      // only when a specific game is created or joined.

    } catch (error) {
        console.error('Wallet mode initialization error:', error);
        alert(`Failed to initialize wallet mode: ${error.message}. Please try again.`);
        // Hide loading overlay on error
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        // Revert to mode selection on error
        document.getElementById('mode-select').style.display = 'block';
        document.getElementById('wallet-connect').style.display = 'none';
        window.ephemeralWallet = null; // Clear wallet instance
    }
  } else {
    // Freeplay mode initialization (remains the same)
    document.getElementById('freeplay-connect').style.display = 'block';
    initializePeerForFreeplay(); // Use a distinct function for clarity
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

// --- Wallet Mode Specific Functions ---

// Mock function to fetch the single predefined game if the player is involved
async function fetchGamesFromContract() {
    if (!window.ephemeralWallet) return [];
    const playerAddress = window.ephemeralWallet.address.toLowerCase();

    // Try generating the game assuming the current player is the creator
    let mockGame = getCreatorMockGameData(playerAddress);

    // If that didn't work (player isn't creator), try generating assuming they are the challenged
    // Note: This uses a placeholder creator address. In reality, the contract would provide the correct game data.
    if (!mockGame) {
        mockGame = getChallengedMockGameData(playerAddress);
    }

    if (mockGame) {
        console.log("Returning mock game:", mockGame);
        mockContractGames = [mockGame]; // Update store
        return [mockGame];
    } else {
        console.log("Current player is not involved in the mock game.");
        mockContractGames = []; // Clear store
        return [];
    }
}

// Updates the UI with the fetched game list
async function displayGameList() {
    const container = document.getElementById('game-list-container');
    const statusElement = document.getElementById('game-list-status');
    if (!container || !statusElement) return;

    // 1. Ensure status element is visible and set initial text
    statusElement.textContent = 'Fetching games...';
    statusElement.style.display = 'block'; // Make sure it's visible

    // 2. Clear only previous game list items (divs within the container)
    const existingGameItems = container.querySelectorAll('div');
    existingGameItems.forEach(item => container.removeChild(item));

    try {
        const games = await fetchGamesFromContract();

        if (games.length === 0) {
            // 3a. No games found: Update status text
            statusElement.textContent = 'No active games found.';
            statusElement.style.display = 'block'; // Ensure it remains visible
        } else {
            // 3b. Games found: Hide status element and add game items
            statusElement.style.display = 'none'; // Hide the status message

            games.forEach(game => {
                const gameElement = document.createElement('div');
                // Apply styles (moved from below)
                gameElement.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            gameElement.style.padding = '8px 0';
            gameElement.style.display = 'flex';
            gameElement.style.justifyContent = 'space-between';
            gameElement.style.alignItems = 'center';

            const playerAddress = window.ephemeralWallet.address.toLowerCase();
            // Determine roles based on potentially placeholder addresses
            const gameCreator = game.creator === "LOCAL_PLAYER_PLACEHOLDER" ? playerAddress : game.creator.toLowerCase();
            const gameChallenged = game.challenged.toLowerCase();
            const isCreator = gameCreator === playerAddress;
            // Determine the actual opponent address based on the player's role
            const opponentAddress = isCreator ? gameChallenged : gameCreator;

            // Always show a Join button for the mock game
            let actionButtonHtml = `<button onclick="handleJoinGame('${game.gameId}')" style="padding: 5px 8px; font-size: 10px;">Join / Rejoin</button>`;

            gameElement.innerHTML = `
                <span style="font-size: 12px;">
                  Game vs ${opponentAddress.substring(0, 6)}... (ID: ${game.gameId})
                </span>
                ${actionButtonHtml}
            `;
            container.appendChild(gameElement);
        });
      } // <-- Add missing closing brace for the 'else' block

    } catch (error) {
        console.error("Error fetching games:", error);
        statusElement.textContent = 'Error loading games.';
        statusElement.style.display = 'block';
    }
}

// Removed createGameOnContract and handleCreateGame functions

// Mock function to simulate joining a game in our store
async function joinGameOnContract(gameId) { // This function is now less relevant but kept for structure
    if (!window.ephemeralWallet) throw new Error("Local wallet not found.");
    const joinerAddress = window.ephemeralWallet.address.toLowerCase();

    const gameIndex = mockContractGames.findIndex(g => g.gameId === gameId);

    if (gameIndex === -1) {
        console.error(`Mock Contract: Game ${gameId} not found in store.`);
        return false; // Game doesn't exist
    }

    const game = mockContractGames[gameIndex];

    // Optional: Check if the joiner is the challenged player (or allow anyone in mock)
    // const gameChallenged = game.challenged === "LOCAL_PLAYER_PLACEHOLDER" ? joinerAddress : game.challenged.toLowerCase();
    // if (gameChallenged !== joinerAddress) {
    //     console.error(`Mock Contract: Player ${joinerAddress} is not challenged for game ${gameId}.`);
    //     return false;
    // }

    if (game.status !== 'waiting' && game.status !== 'pending') {
        console.warn(`Mock Contract: Game ${gameId} is not in 'waiting' or 'pending' status (current: ${game.status}). Allowing join anyway for testing.`);
        // return false; // Or strictly prevent joining non-waiting/pending games
    }

    // Update game status in the mock store
    mockContractGames[gameIndex].status = 'active';
    console.log(`Mock Contract: Player ${joinerAddress} joined game ${gameId}. Status updated to active.`);
    console.log("Current mockContractGames:", mockContractGames);
    return true; // Indicate success
}

// Handles the "Join" button click for a specific game
async function handleJoinGame(gameId) {
     if (!window.ephemeralWallet) {
        alert("Wallet not connected.");
        return;
    }
    // Find the button clicked to disable it (optional, good UX)
    const joinButton = event.target;
    if(joinButton) {
        joinButton.textContent = 'Initializing...';
        joinButton.disabled = true;
    }

    try {
        // 1. Get player address
        if (!window.ephemeralWallet) throw new Error("Wallet not connected.");
        const playerAddress = window.ephemeralWallet.address.toLowerCase();

        // 2. Get the specific game data (using the fixed ID)
        // We need to know who the creator is for this game ID.
        // In a real scenario, we'd fetch game details by ID.
        // For mock, assume getCreatorMockGameData gives the canonical game state.
        const gameData = getCreatorMockGameData(playerAddress) || getChallengedMockGameData(playerAddress); // Get game data based on current player role

        if (!gameData || gameData.gameId !== gameId) {
             // If the game isn't found for the current player, maybe they are the opponent?
             // Let's try fetching assuming the *other* player created it.
             // This is hacky for mock - real contract fetch is needed.
             console.warn("Couldn't find game data assuming current player is creator/challenged. Trying opponent perspective.");
             // We need the creator's address if we are the challenged one.
             // For mock, we can't easily know this without more info.
             // Let's stick to the primary mock game definition for now.
             // Re-fetch using the fixed ID logic.
             const potentialGame = (mockContractGames.length > 0 && mockContractGames[0].gameId === gameId) ? mockContractGames[0] : null;
             if (!potentialGame) {
                 throw new Error(`Mock game data not found for game ID ${gameId}`);
             }
             // Re-determine roles based on stored/fetched game data
             const creatorAddress = potentialGame.creator.toLowerCase();
             const challengedAddress = potentialGame.challenged.toLowerCase();
             isHost = (playerAddress === creatorAddress);

             if (playerAddress !== creatorAddress && playerAddress !== challengedAddress) {
                 throw new Error("Current player is not part of this game.");
             }
             console.log(`Joining game ${gameId}. Role: ${isHost ? 'Host (Creator)' : 'Client (Challenged)'}`);
             gameState.currentGameId = gameId; // Store game ID

        } else {
             // Game data found directly, determine role
             isHost = (gameData.creator.toLowerCase() === playerAddress);
             console.log(`Joining game ${gameId}. Role: ${isHost ? 'Host (Creator)' : 'Client (Challenged)'}`);
             gameState.currentGameId = gameId; // Store game ID
        }


        // 3. Initialize PeerJS with player's own address
        await initializePeerWithAddress(playerAddress);

        // 4. Connect or Wait
        if (!isHost) {
            // Player is the challenged client, connect to the creator's address
            const creatorAddress = mockContractGames.find(g => g.gameId === gameId)?.creator;
            if (!creatorAddress) throw new Error("Could not determine creator address for connection.");
            if (joinButton) joinButton.textContent = 'Connecting...';
            await connectToPeerAddress(creatorAddress);
        } else {
            // Player is the creator host, just wait for connection
            const connectionStatusElement = document.querySelector(`#wallet-connect #connection-status`);
            if (connectionStatusElement) {
                connectionStatusElement.innerHTML = `Waiting for opponent...`;
                connectionStatusElement.style.color = '#eee';
            }
             // Re-enable button for host? Or keep disabled until connected?
             // Let's keep it disabled for now to avoid re-clicking.
             // if(joinButton) joinButton.disabled = false; // Optional
        }

    } catch (error) {
        // Re-enable button on error
        // Re-enable button on error
        if(joinButton) {
             joinButton.textContent = 'Join / Rejoin';
             joinButton.disabled = false;
        }
        console.error("Error joining game:", error);
        alert(`Failed to join game: ${error.message}`);
         if(joinButton) joinButton.disabled = false; // Re-enable button on error
    }
}

// Removed handleStartListeningHost function

// Removed derivePeerId, initializePeerWithGameId, connectToHostPeer

// Initializes PeerJS using the player's ephemeral wallet address
async function initializePeerWithAddress(playerAddress) {
    if (!playerAddress) {
        throw new Error("Player address is required to initialize PeerJS.");
    }
    const peerId = playerAddress; // Use the full address as the PeerJS ID

    if (peer && peer.id === peerId && !peer.disconnected) {
        console.log(`PeerJS already initialized with ID ${peerId}.`);
        return peer; // Return existing peer
    }

    console.log(`Initializing PeerJS with ID: ${peerId}`);
    const connectionStatusElement = document.querySelector(`#wallet-connect #connection-status`);
    if (connectionStatusElement) connectionStatusElement.textContent = `Initializing P2P...`;

    // Standard PeerJS config
    const peerConfig = {
        debug: 2,
        config: {
            'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                // Add more STUN/TURN if needed
            ]
        }
    };

    return new Promise((resolve, reject) => {
        // Destroy existing peer if necessary
        if (peer) {
            peer.destroy();
        }

        peer = new Peer(peerId, peerConfig);

        peer.on('open', (id) => {
            console.log('PeerJS connection open. My ID:', id);
            if (connectionStatusElement) {
                // Status updated based on role (creator/challenged) in handleJoinGame
            }

            // Always listen for incoming connections (creator waits, challenged might receive confirmation)
            peer.on('connection', (connection) => {
                console.log(`Incoming connection from ${connection.peer}`);
                if (conn && conn.open) {
                    console.warn("Already connected. Rejecting new connection.");
                    connection.close();
                    return;
                }
                conn = connection;
                // Determine host status based on who initiated the connection
                // In this model, the creator *receives* the connection, so they are host.
                isHost = true; // The one receiving the connection is the host
                handleConnection(); // Set up handlers
            });
            resolve(peer);
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
            if (connectionStatusElement) {
                connectionStatusElement.textContent = `P2P Error: ${err.type}`;
                connectionStatusElement.style.color = '#ff6b6b';
            }
            if (peer && !peer.destroyed) peer.destroy();
            peer = null;
            reject(err);
        });

        peer.on('disconnected', () => {
            console.log('PeerJS disconnected.');
             if (connectionStatusElement) {
                connectionStatusElement.textContent = 'P2P Disconnected.';
                connectionStatusElement.style.color = '#ffcc00';
             }
             // Consider adding reconnect logic if needed
        });
    });
}

// Attempts to connect to a specific peer address
async function connectToPeerAddress(targetAddress) {
    if (!peer || peer.disconnected) {
        throw new Error("PeerJS not initialized or disconnected.");
    }
    if (!targetAddress) {
        throw new Error("Target address is required to connect.");
    }
    // Cannot connect to self
    if (peer.id === targetAddress) {
         console.warn("Attempted to connect to self.");
         // If we are the creator, just wait.
         if (isHost) {
             const connectionStatusElement = document.querySelector(`#wallet-connect #connection-status`);
             if (connectionStatusElement) {
                 connectionStatusElement.innerHTML = `Waiting for opponent...`;
                 connectionStatusElement.style.color = '#eee';
             }
             return; // Don't proceed with connection
         } else {
             throw new Error("Cannot connect to self.");
         }
    }


    console.log(`Attempting to connect to peer: ${targetAddress}`);
    const connectionStatusElement = document.querySelector(`#wallet-connect #connection-status`);
    if (connectionStatusElement) {
        connectionStatusElement.textContent = `Connecting to opponent...`;
        connectionStatusElement.style.color = '#aaa';
    }

    const connectionTimeout = setTimeout(() => {
        if (!conn || !conn.open) {
            console.error('Connection timed out.');
            if (connectionStatusElement) {
                connectionStatusElement.textContent = 'Connection timed out.';
                connectionStatusElement.style.color = '#ff9800';
            }
        }
    }, 20000); // 20s timeout

    try {
        conn = peer.connect(targetAddress, { reliable: true, serialization: 'json' });

        if (!conn) {
            throw new Error('peer.connect() failed.');
        }

        // Setup handlers for the outgoing connection
        handleConnection(); // Sets up 'data', 'error', 'close'

        conn.on('open', () => {
            clearTimeout(connectionTimeout);
            console.log(`Connection to ${targetAddress} established.`);
            if (connectionStatusElement) {
                connectionStatusElement.textContent = 'Connected!';
                connectionStatusElement.style.color = '#4caf50';
            }
            // isHost should be false here as we initiated the connection
            isHost = false;
            // Rest of game start logic is in handleConnection's 'open' handler
        });

         conn.on('error', (err) => {
            console.error('Connection error:', err);
            clearTimeout(connectionTimeout);
             if (connectionStatusElement) {
                connectionStatusElement.textContent = `Connection Error: ${err.type}`;
                connectionStatusElement.style.color = '#f44336';
             }
        });

    } catch (err) {
        console.error('Error initiating connection:', err);
        clearTimeout(connectionTimeout);
        if (connectionStatusElement) {
            connectionStatusElement.textContent = 'Failed to initiate connection.';
            connectionStatusElement.style.color = '#f44336';
        }
        throw err; // Re-throw error to be caught by handleJoinGame
    }
}


// --- Freeplay Mode Specific Functions ---

// Initializes PeerJS for freeplay mode
function initializePeerForFreeplay() {
    // Use a random ID for freeplay
    const peerId = `free-${Math.random().toString(36).substr(2, 9)}`;

    const peerConfig = {
        debug: 2,
        config: {
            'iceServers': [ { urls: 'stun:stun.l.google.com:19302' } ] // Simple STUN for freeplay
        }
    };

    const displayContainerId = 'freeplay-connect';
    const peerDisplayElement = document.querySelector(`#${displayContainerId} #peer-id-display`);
    const connectionStatusElement = document.querySelector(`#${displayContainerId} #connection-status`);

     if (peerDisplayElement) {
        peerDisplayElement.innerHTML = `Connecting...`; // Simple status
    }

    // If peer exists, destroy it first
    if (peer) {
        peer.destroy();
    }

    peer = new Peer(peerId, peerConfig);

     peer.on('open', (id) => {
        console.log('Freeplay PeerJS open. ID:', id);
        if (peerDisplayElement) {
             peerDisplayElement.innerHTML = `
                Your game ID: <span style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px; cursor: pointer;" onclick="copyPeerId(this.parentNode)" title="Click to copy game ID">${id}</span>
                 <div id="copy-tooltip" style="position: absolute; background: rgba(0,0,0,0.8); color: white; padding: 5px; border-radius: 4px; font-size: 12px; bottom: 100%; left: 50%; transform: translateX(-50%); display: none; white-space: nowrap;">
                   Copied!
                 </div>
             `;
        }
         if (connectionStatusElement) {
            connectionStatusElement.textContent = 'Waiting for connection...';
            connectionStatusElement.style.color = '#aaa';
        }

        // Listen for incoming connections (acts as host in freeplay)
        peer.on('connection', (connection) => {
            console.log("Freeplay: Incoming connection received.");
            if (conn && conn.open) {
                console.warn("Freeplay: Already connected. Rejecting new connection.");
                connection.close();
                return;
            }
            conn = connection;
            isHost = true; // Receiver is host
            handleConnection();
        });
    });

    peer.on('error', (err) => {
        console.error('Freeplay PeerJS error:', err);
         if (peerDisplayElement) peerDisplayElement.innerHTML = `Error: ${err.type}`;
         if (connectionStatusElement) connectionStatusElement.textContent = 'P2P Error';
    });

     peer.on('disconnected', () => {
        console.log('Freeplay PeerJS disconnected.');
         if (connectionStatusElement) connectionStatusElement.textContent = 'Disconnected';
    });
}

// Connects to a peer in freeplay mode
function connectToPeerFreeplay() {
    const containerId = 'freeplay-connect';
    const peerIdInput = document.querySelector(`#${containerId} #peer-id-input`);
    const joinButton = document.querySelector(`#${containerId} button[onclick="connectToPeerFreeplay()"]`);

    if (!peerIdInput || !joinButton) return; // Basic check

    const peerId = peerIdInput.value.trim();
    if (!peerId) { alert('Please enter a Game ID'); return; }
    if (!peer || peer.disconnected) { alert('Not connected to P2P network. Refresh?'); return; }

    const originalText = joinButton.textContent;
    joinButton.innerHTML = 'Connecting...';
    joinButton.disabled = true;

    const connectionTimeout = setTimeout(() => {
        if (!conn || !conn.open) {
            joinButton.textContent = originalText;
            joinButton.disabled = false;
            alert('Connection timed out.');
        }
    }, 15000);

    try {
        conn = peer.connect(peerId, { reliable: true, serialization: 'json' });
        if (!conn) throw new Error('peer.connect failed');

        isHost = false; // Initiator is client
        handleConnection(); // Setup handlers

        conn.on('open', () => {
            clearTimeout(connectionTimeout);
            joinButton.textContent = 'Connected!';
        });
        conn.on('error', (err) => {
            clearTimeout(connectionTimeout);
            joinButton.textContent = originalText;
            joinButton.disabled = false;
            alert('Connection error: ' + err.type);
        });

    } catch (err) {
        clearTimeout(connectionTimeout);
        joinButton.textContent = originalText;
        joinButton.disabled = false;
        alert('Error connecting: ' + err.message);
    }
}


// --- Common Networking Functions ---

// Note: PeerJS error/disconnect handlers are now inside initializePeerWithGameId and initializePeerForFreeplay

// Removed extra closing brace that was here.
// Removed old peer.on('error') and peer.on('disconnected') handlers previously here.

// Removed the old connectToPeer function. Use connectToPeerFreeplay or connectToHostPeer instead.

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

// Generic handler for established connections (used by both host and client)
function handleConnection() {
    // Set up connection event handlers ONLY ONCE per connection object
    if (conn._events && conn._events.open && conn._events.open.length > 0) {
        console.log("Handlers already attached to this connection.");
        return;
    }

    conn.on('open', () => {
        console.log(`Connection opened with peer: ${conn.peer}`);
        // Hide the specific connection UI (wallet or freeplay)
        const authContainer = document.getElementById('auth-container');
        if (authContainer) authContainer.style.display = 'none';

        // Initialize move sync (common for both modes, determines player positions)
        gameState.moveSync.initGame(isHost);

        // Set initial player states and visibility
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

            // Initialize SignedMoveManager if in wallet mode, using the stored gameId
            if (gameMode === 'wallet' && window.ephemeralWallet && gameState.currentGameId) {
                // Use currentGameId as the genesis hash for the move manager
                initSignedMoveManager(window.ephemeralWallet.address, gameState.currentGameId);
            } else if (gameMode === 'wallet') {
                 console.error("Wallet mode connection opened, but wallet or gameId missing!");
                 // Handle this error state? Disconnect?
            }

            // Tell the other peer they are player 2 (client) - only host sends this
            conn.send({ type: 'playerAssignment', assignment: 'player2' });

            // Host starts the countdown immediately
            startCountdown();

        } else {
            // Client setup (Player 2) - triggered when conn opens after peer.connect()
            player.facingLeft = false; // Opponent faces right
            player.switchSprite('idle');
            player2.facingLeft = true;
            player2.switchSprite('idle');

            gameState.player1Connected = true; // Remote player
            player.show();
            gameState.player2Connected = true; // Local player
            player2.show();

             // Initialize SignedMoveManager if in wallet mode, using the stored gameId
            if (gameMode === 'wallet' && window.ephemeralWallet && gameState.currentGameId) {
                // Client uses their own wallet address and the known gameId
                 initSignedMoveManager(window.ephemeralWallet.address, gameState.currentGameId);
            } else if (gameMode === 'wallet') {
                 console.error("Wallet mode connection opened, but wallet or gameId missing!");
            }
            // Client waits for countdown start signal (received in 'playerAssignment' data)
        }

        // Start ping/pong and status updates for both host and client once connection is open
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
