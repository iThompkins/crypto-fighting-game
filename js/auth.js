// Initialize Gun and SEA
const SEA = Gun.SEA;
const gun = Gun({
  peers: ['http://localhost:8765/gun'],
  localStorage: false // Disable localStorage to prevent auth conflicts
});
let currentUser = null;
let payerWallet = null;  // MetaMask wallet
let playerWallet = null; // Generated game wallet
let gameToken = "DUMMY_GAME_TOKEN"; // TODO: Replace with actual game token generation
let lastSignedMove = null;

async function connectWallet() {
    if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
    }

    try {
        // Request account access for MetaMask (payer wallet)
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        payerWallet = accounts[0];
        
        // Create new player wallet
        playerWallet = ethers.Wallet.createRandom();
        
        // Sign message to authenticate
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // Create a simple authentication message
        const message = `Login to Fighting Game with address: ${payerWallet}`;
        const signature = await signer.signMessage(message);
        
        // Create a simpler password using the first 32 chars of signature
        const pass = signature.slice(0, 32);
        
        // Try to authenticate
        currentUser = gun.user();
        
        try {
            // Always try to create first (idempotent operation)
            await new Promise((resolve) => {
                currentUser.create(payerWallet, pass, (ack) => {
                    resolve();
                });
            });

            // Then authenticate
            const authResult = await new Promise((resolve, reject) => {
                currentUser.auth(payerWallet, pass, (ack) => {
                    if (ack.err) {
                        reject(new Error(ack.err));
                    } else {
                        resolve(ack);
                    }
                });
            });
        } catch (err) {
            console.error('Auth error:', err);
            throw err;
        }
        
        // Store player wallet info securely
        const walletData = {
            address: playerWallet.address,
            timestamp: Date.now()
        };
        currentUser.get('playerWallet').put(walletData);
        
        // Sign initial game token
        lastSignedMove = await playerWallet.signMessage(gameToken);
        
        console.log('Authenticated with payer wallet:', payerWallet);
        console.log('Created player wallet:', playerWallet.address);
        return true;
    } catch (error) {
        console.error('Auth error:', error);
        return false;
    }
}

const FRAME_RATE = 30;
const FRAME_INTERVAL = 1000 / FRAME_RATE;
let lastMoveTime = 0;

async function emitGameMove(move, opponentMove = null) {
    if (!currentUser || !playerWallet) {
        console.error('User not authenticated');
        return;
    }

    const currentTime = Date.now();
    if (currentTime - lastMoveTime < FRAME_INTERVAL) {
        return; // Skip if not enough time has passed
    }

    try {
        // Sign the previous move or game token
        const prevSignature = lastSignedMove || await playerWallet.signMessage(gameToken);
        
        // Create move string: keys-signature
        const moveString = `${move}-${prevSignature}`;
        
        // Sign and emit the move
        lastSignedMove = await playerWallet.signMessage(moveString);
        gun.get('gameMoves').set(moveString);
        lastMoveTime = currentTime;
    } catch (error) {
        console.error('Move emission error:', error);
    }
}

function listenForMoves(callback) {
    if (!gun) {
        console.error('Gun not initialized');
        return;
    }
    gun.get('gameMoves').map().on((move, id) => {
        if (move.player !== playerWallet?.address) {
            callback(move);
        }
    });
}
