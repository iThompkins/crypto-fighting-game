let peer = null;
let conn = null;
let isHost = false;

// Initialize networking when the game loads
window.addEventListener('load', checkWalletAndInit);

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

function initializePeer(wallet) {
    // Create a peer ID based on wallet address
    const peerId = wallet.address.slice(2, 12); // Use first 10 chars of address
    peer = new Peer(peerId);

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        document.getElementById('auth-container').innerHTML = `
            <div style="text-align: center;">
                <p>Connected with wallet: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}</p>
                <p>Your game ID: ${id}</p>
                <input id="peer-id-input" placeholder="Enter friend's game ID" style="margin: 10px; padding: 5px;">
                <button onclick="connectToPeer()" style="padding: 10px;">Join Game</button>
            </div>
        `;
        
        // Start rendering the game immediately after wallet connection
        gameState.player1Connected = true;
        player.show();
        renderEnvironment(); // Start the environment render loop
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
