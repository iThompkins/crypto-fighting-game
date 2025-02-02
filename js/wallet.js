const WALLET_STORAGE_KEY = 'CryptoFightingGameWallet';

async function checkExistingWallet() {
    const encryptedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!encryptedWallet) return null;

    try {
        // Get MetaMask account for password
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const password = accounts[0]; // Use MetaMask address as password
        
        // Decrypt the wallet
        const wallet = await ethers.Wallet.fromEncryptedJson(encryptedWallet, password);
        return wallet;
    } catch (error) {
        console.error('Error decrypting wallet:', error);
        // If decryption fails, remove invalid data
        localStorage.removeItem(WALLET_STORAGE_KEY);
        return null;
    }
}

async function generateAndEncryptWallet() {
    try {
        // Generate a new random wallet
        const wallet = ethers.Wallet.createRandom();
        
        // Get MetaMask account for password
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const password = accounts[0]; // Use MetaMask address as password
        
        // Encrypt wallet with reduced complexity for faster processing
        const encryptedWallet = await wallet.encrypt(password, {
            scrypt: {
                N: 64 // Reduced from default 131072
            }
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
