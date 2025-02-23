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
                <p>Your game ID: ${id}</p>
            `;
        } else {
            document.getElementById('peer-id-display').innerHTML = `
                <p>Your game ID: ${id}</p>
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

function handleConnection() {
    conn.on('open', () => {
        document.getElementById('auth-container').style.display = 'none';
        
        if (isHost) {
            gameState.player1Connected = true;
            player.show();
        } else {
            gameState.player2Connected = true;
            enemy.show();
        }

        if (gameState.player1Connected && gameState.player2Connected) {
            startCountdown();
        }
    });

    conn.on('data', (data) => {
        handleGameData(data);
    });
}

function sendGameMove(moveData) {
    if (conn && conn.open) {
        conn.send(moveData);
    }
}

function handleGameData(data) {
    if (!data.keys) return;
    updatePlayerState(data.keys);
    if (isHost) {
        player2.update();
    } else {
        player.update();
    }
}
