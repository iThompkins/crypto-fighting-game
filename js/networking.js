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
    peer = new Peer(peerId);

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        if (wallet) {
            document.getElementById('peer-id-display').innerHTML = `
                <p>Connected with wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}</p>
                <p>Your game ID: <span style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px;">${id}</span></p>
            `;
        } else {
            document.getElementById('peer-id-display').innerHTML = `
                <p>Your game ID: <span style="background: rgba(255,255,255,0.1); padding: 5px; border-radius: 4px;">${id}</span></p>
            `;
        }
        
        // Start rendering the game immediately after wallet connection
        gameState.player1Connected = true;
        player.show();
    });

    peer.on('connection', (connection) => {
        conn = connection;
        isHost = true;
        handleConnection();
    });
}

function connectToPeer() {
    const peerId = document.getElementById('peer-id-input').value;
    conn = peer.connect(peerId);
    isHost = false;
    handleConnection();
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
    conn.on('open', () => {
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
        } else {
            // Joiner is always player 2
            gameState.player1Connected = true;
            player.show();
            gameState.player2Connected = true;
            player2.show();
        }
    });

    conn.on('data', (data) => {
        if (data.type === 'playerAssignment') {
            // Start countdown for player 2
            startCountdown();
        } else {
            handleGameData(data);
        }
    });
}

function sendGameMove(moveData) {
    if (conn && conn.open) {
        conn.send(moveData);
    }
}

function handleGameData(data) {
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
