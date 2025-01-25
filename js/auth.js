// Initialize Gun and SEA
const SEA = Gun.SEA;
const gun = Gun({
  peers: ['http://localhost:8765/gun']
});

// Debug GUN storage location
console.log('GUN storage:', localStorage.getItem('gun/'));
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

    // Show loader and disable button
    const button = document.getElementById('connect-wallet');
    const buttonText = document.getElementById('wallet-button-text');
    const loader = document.getElementById('wallet-loader');
    
    button.disabled = true;
    buttonText.style.visibility = 'hidden';
    loader.style.display = 'block';

    try {
        // Request account access for MetaMask (payer wallet)
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        payerWallet = accounts[0];
        
        // Create new player wallet
        playerWallet = ethers.Wallet.createRandom();
        
        // Sign message to authenticate
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // Have MetaMask sign its own address as the auth key
        const authMessage = `Sign in to Fighting Game with address: ${payerWallet}`;
        const authKey = await signer.signMessage(authMessage);

        currentUser = gun.user();
        
        // Try to create user first (idempotent operation)
        await new Promise((resolve) => {
            currentUser.create(payerWallet, authKey, (ack) => {
                console.log('Create response:', ack);
                resolve();
            });
        });

        // Then authenticate
        await new Promise((resolve, reject) => {
            currentUser.auth(payerWallet, authKey, (ack) => {
                console.log('Auth response:', ack);
                if (ack.err) {
                    reject(new Error(ack.err));
                } else {
                    resolve();
                }
            });
        });

        // Store wallet data after successful auth
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
        throw error;
    } finally {
        // Hide loader and enable button
        const button = document.getElementById('connect-wallet');
        const buttonText = document.getElementById('wallet-button-text');
        const loader = document.getElementById('wallet-loader');
        
        button.disabled = false;
        buttonText.style.visibility = 'visible';
        loader.style.display = 'none';
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
