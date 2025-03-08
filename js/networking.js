let peer = null;
let conn = null;
let isHost = false;
let gameMode = null;

function selectMode(mode) {
  gameMode = mode;
  document.getElementById('mode-select').style.display = 'none';
  
  if (mode === 'wallet') {
    document.getElementById('wallet-connect').style.display = 'block';
    checkWalletAndInit();
  } else {
    document.getElementById('freeplay-connect').style.display = 'block';
    initializePeer();
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

async function checkWalletAndInit() {
    const existingWallet = await checkExistingWallet();
    if (existingWallet) {
        initializePeer(existingWallet);
    } else {
        // Show join button if no wallet exists
        document.getElementById('auth-container').innerHTML = `
            <button onclick="initializeNetworking()" style="padding: 10px; font-family: 'Press Start 2P', cursive; min-width: 200px;">
                Join Game
            </button>
        `;
    }
}

async function initializeNetworking() {
    try {
        const wallet = await connectWallet();
        if (!wallet) {
            alert('Failed to connect wallet. Please try again.');
            return;
        }
        initializePeer(wallet);
    } catch (error) {
        console.error('Networking initialization error:', error);
        alert('Failed to initialize networking. Please try again.');
    }
}

function initializePeer(wallet = null) {
    // Create a random peer ID for freeplay mode or use wallet address
    const peerId = wallet ? wallet.address.slice(2, 12) : Math.random().toString(36).substr(2, 10);
    
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
    
    peer = new Peer(peerId, peerConfig);

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        if (wallet) {
            document.getElementById('peer-id-display').innerHTML = `
                <p>Connected with wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}</p>
                <p>Your game ID: <span style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px;">${id}</span></p>
            `;
            
            // Initialize move validator for wallet mode
            initMoveValidator(wallet.address);
        } else {
            document.getElementById('peer-id-display').innerHTML = `
                <p>Your game ID: <span style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px;">${id}</span></p>
            `;
        }
        
        // Start rendering the game immediately after connection
        gameState.player1Connected = true;
        player.show();
    });

    peer.on('connection', (connection) => {
        conn = connection;
        isHost = true;
        handleConnection();
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
    const peerId = document.getElementById('peer-id-input').value.trim();
    
    if (!peerId) {
        alert('Please enter a valid Game ID');
        return;
    }
    
    // Show connecting status
    const joinButton = document.querySelector('#freeplay-connect button');
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
        
        isHost = false;
        handleConnection();
        
        // Reset button after successful connection
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
        
        if (isHost) {
            // Host is always player 1
            gameState.player1Connected = true;
            player.show();
            gameState.player2Connected = true;
            player2.show();
            // Tell the other peer they're player 2
            conn.send({ type: 'playerAssignment', isPlayer2: true });
            // Host starts countdown
            startCountdown();
            // Start ping/pong
            startPingPong();
            // Start connection status updates
            startConnectionStatusUpdates();
        } else {
            // Joiner is always player 2
            gameState.player1Connected = true;
            player.show();
            gameState.player2Connected = true;
            player2.show();
            // Start ping/pong
            startPingPong();
            // Start connection status updates
            startConnectionStatusUpdates();
        }
    });

    conn.on('data', (data) => {
        try {
            if (data.type === 'playerAssignment') {
                // Start countdown for player 2
                startCountdown();
            } else if (data.type === 'ping' || data.type === 'pong') {
                // Handle ping/pong for connection health
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
    });
}

function sendGameMove(moveData) {
    if (conn && conn.open) {
        try {
            conn.send(moveData);
        } catch (err) {
            console.error('Error sending game move:', err);
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
}

// Handle data for free play mode
function handleFreePlayData(data) {
    // In free play, we directly update the opponent's state
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

// Handle data for wallet mode with move validation
function handleWalletGameData(data) {
    // Validate move chain
    const validation = gameState.moveValidator.validateMoveChain(data.moveChain);
    
    if (!validation.valid) {
        alert(`Invalid game state detected: ${validation.reason}`);
        // TODO: Submit bad game state to contract
        return;
    }

    // Add valid move to our chain
    gameState.moveValidator.addMove(validation.newMove);
    
    // Update opponent state based on the new move
    const opponentPlayer = isHost ? player2 : player;
    const keys = validation.newMove.keyCode;
    
    // Update visual state based on received keys
    if (keys.includes('a') || keys.includes('ArrowLeft')) {
        opponentPlayer.switchSprite('run');
        opponentPlayer.velocity.x = -5;
    } else if (keys.includes('d') || keys.includes('ArrowRight')) {
        opponentPlayer.switchSprite('run');
        opponentPlayer.velocity.x = 5;
    } else {
        opponentPlayer.switchSprite('idle');
        opponentPlayer.velocity.x = 0;
    }

    if ((keys.includes('w') || keys.includes('ArrowUp'))) {
        if (opponentPlayer.velocity.y === 0) {
            opponentPlayer.velocity.y = -20;
            opponentPlayer.switchSprite('jump');
        }
    } else if (opponentPlayer.velocity.y > 0) {
        opponentPlayer.switchSprite('fall');
    }

    // Handle attacking
    if ((keys.includes(' ') || keys.includes('ArrowDown'))) {
        if (!opponentPlayer.isAttacking) {
            opponentPlayer.attack();
        }
    }
}
