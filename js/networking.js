let peer = null;
let conn = null;
let isHost = false;

function initializeNetworking() {
    // Create a random peer ID
    const peerId = Math.random().toString(36).substring(7);
    peer = new Peer(peerId);

    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
        document.getElementById('auth-container').innerHTML = `
            <div style="text-align: center;">
                <p>Your game ID: ${id}</p>
                <input id="peer-id-input" placeholder="Enter friend's game ID" style="margin: 10px; padding: 5px;">
                <button onclick="connectToPeer()" style="padding: 10px;">Join Game</button>
            </div>
        `;
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
    
    if (isHost) {
        // Update enemy (player 2) state
        keys.ArrowLeft.pressed = data.keys.includes('ArrowLeft');
        keys.ArrowRight.pressed = data.keys.includes('ArrowRight');
        if (data.keys.includes('ArrowUp')) enemy.velocity.y = -20;
        if (data.keys.includes('ArrowDown')) enemy.attack();
    } else {
        // Update player 1 state
        keys.a.pressed = data.keys.includes('a');
        keys.d.pressed = data.keys.includes('d');
        if (data.keys.includes('w')) player.velocity.y = -20;
        if (data.keys.includes(' ')) player.attack();
    }
}
