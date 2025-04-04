const WALLET_STORAGE_KEY = 'CryptoFightingGameWallet';

async function checkExistingWallet() {
    const encryptedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!encryptedWallet) return null;

    try {
        if (!window.ethereum) return null;
        
        // Just check if MetaMask is connected, don't request accounts yet
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) return null;
        
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

// Global variable to hold the decrypted wallet instance
let ephemeralWalletInstance = null;

async function getEphemeralWallet() {
    if (ephemeralWalletInstance) {
        return ephemeralWalletInstance;
    }

    const encryptedWallet = localStorage.getItem(WALLET_STORAGE_KEY);
    if (!encryptedWallet) {
        console.error("No encrypted wallet found in storage.");
        return null;
    }

    try {
        if (!window.ethereum) {
            console.error("MetaMask is not available.");
            return null;
        }
        
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
            console.error("MetaMask not connected or no accounts found.");
            // Maybe prompt connection again?
            // For now, return null. User might need to reconnect via UI.
            return null; 
        }
        
        const password = accounts[0]; // Use MetaMask address as password
        
        // Decrypt the wallet
        ephemeralWalletInstance = await ethers.Wallet.fromEncryptedJson(encryptedWallet, password);
        console.log("Ephemeral wallet decrypted successfully:", ephemeralWalletInstance.address);
        return ephemeralWalletInstance;
    } catch (error) {
        console.error('Error decrypting wallet for signing:', error);
        // If decryption fails, remove invalid data and clear instance
        localStorage.removeItem(WALLET_STORAGE_KEY);
        ephemeralWalletInstance = null;
        // Maybe alert the user or trigger re-generation flow?
        alert("Failed to access your game wallet. You might need to reconnect your main wallet.");
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
        
        // Encrypt wallet using default security settings
        const encryptedWallet = await wallet.encrypt(password);
        
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

    const buttonText = document.getElementById('wallet-button-text');
    const loader = document.getElementById('wallet-loader');
    if (buttonText) buttonText.style.display = 'none';
    if (loader) loader.style.display = 'block';

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
        const buttonText = document.getElementById('wallet-button-text');
        const loader = document.getElementById('wallet-loader');
        if (buttonText) buttonText.style.display = 'block';
        if (loader) loader.style.display = 'none';
    }
}
