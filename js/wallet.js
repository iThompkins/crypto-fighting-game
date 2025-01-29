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
        
        // Parse the decrypted wallet data
        try {
            return JSON.parse(decryptedWallet);
        } catch {
            // If parsing fails, remove invalid data and return null
            localStorage.removeItem(WALLET_STORAGE_KEY);
            return null;
        }
    } catch (error) {
        console.error('Error decrypting wallet:', error);
        if (error.code === 4001) {
            // User rejected decryption
            throw new Error('Please allow decryption in MetaMask to continue');
        }
        return null;
    }
}

async function generateAndEncryptWallet() {
    try {
        // Generate a new random wallet
        const wallet = ethers.Wallet.createRandom();
        
        // Get MetaMask account
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Get encryption public key from MetaMask
        const encryptionPublicKey = await window.ethereum.request({
            method: 'eth_getEncryptionPublicKey',
            params: [accounts[0]]
        });
        
        // Encrypt the wallet data using MetaMask's public key
        const encryptedMessage = ethers.utils.encryptDataV2({
            publicKey: encryptionPublicKey,
            data: JSON.stringify({
                address: wallet.address,
                privateKey: wallet.privateKey
            }),
            version: 'x25519-xsalsa20-poly1305'
        });
        
        // Store encrypted wallet
        localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(encryptedMessage));
        return wallet;
    } catch (error) {
        if (error.code === 4001) {
            // User rejected encryption permission
            throw new Error('Please allow encryption permission in MetaMask to continue');
        }
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
