const WALLET_STORAGE_KEY = 'CryptoFightingGameWallet';

async function checkExistingWallet() {
    const encryptedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!encryptedWallet) return null;

    try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const decryptedWallet = await window.ethereum.request({
            method: 'eth_decrypt',
            params: [encryptedWallet, accounts[0]]
        });
        return JSON.parse(decryptedWallet);
    } catch (error) {
        console.error('Error decrypting wallet:', error);
        return null;
    }
}

async function generateAndEncryptWallet() {
    try {
        // Generate a new random wallet
        const wallet = ethers.Wallet.createRandom();
        
        // Get MetaMask account
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Encrypt wallet data
        const encryptedWallet = await window.ethereum.request({
            method: 'eth_encrypt',
            params: [
                JSON.stringify({
                    address: wallet.address,
                    privateKey: wallet.privateKey
                }),
                accounts[0]
            ]
        });
        
        // Store encrypted wallet
        localStorage.setItem(WALLET_STORAGE_KEY, encryptedWallet);
        return wallet;
    } catch (error) {
        console.error('Error generating wallet:', error);
        throw error;
    }
}

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use this feature!');
        return null;
    }

    document.getElementById('wallet-button-text').style.display = 'none';
    document.getElementById('wallet-loader').style.display = 'block';

    try {
        let wallet = await checkExistingWallet();
        if (!wallet) {
            wallet = await generateAndEncryptWallet();
        }
        return wallet;
    } catch (error) {
        console.error('Wallet connection error:', error);
        alert('Error connecting wallet: ' + error.message);
        return null;
    } finally {
        document.getElementById('wallet-button-text').style.display = 'block';
        document.getElementById('wallet-loader').style.display = 'none';
    }
}
