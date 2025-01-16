const gun = Gun(['http://localhost:8765/gun']);
let currentUser = null;
let userWallet = null;

async function connectWallet() {
    if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
    }

    try {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userWallet = accounts[0];
        
        // Sign message to authenticate
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const signature = await signer.signMessage(`Login to Fighting Game with address: ${userWallet}`);
        
        // Create GUN user with wallet address as username and signature as password
        currentUser = gun.user();
        await currentUser.create(userWallet, signature);
        await currentUser.auth(userWallet, signature);
        
        console.log('Authenticated with wallet:', userWallet);
        return true;
    } catch (error) {
        console.error('Auth error:', error);
        return false;
    }
}

const FRAME_RATE = 30;
const FRAME_INTERVAL = 1000 / FRAME_RATE;
let lastMoveTime = 0;

function emitGameMove(move, previousMoveSignature = null) {
    if (!currentUser) {
        console.error('User not authenticated');
        return;
    }

    const currentTime = Date.now();
    if (currentTime - lastMoveTime < FRAME_INTERVAL) {
        return; // Skip if not enough time has passed
    }

    const moveData = {
        move,
        timestamp: currentTime,
        player: userWallet,
        previousMoveSignature,
        frameNumber: Math.floor(currentTime / FRAME_INTERVAL)
    };

    // Sign the move data
    // TODO: Implement actual signing logic
    
    // Emit to GUN
    gun.get('gameMoves').set(moveData);
    lastMoveTime = currentTime;
}

function listenForMoves(callback) {
    gun.get('gameMoves').map().on((move, id) => {
        if (move.player !== userWallet) {
            callback(move);
        }
    });
}
