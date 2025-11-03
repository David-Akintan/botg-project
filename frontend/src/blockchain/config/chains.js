export const SUPPORTED_CHAINS = {
  // GenLayer Testnet (example - replace with actual GenLayer config)
  GENLAYER_TESTNET: {
    chainId: '0x...',  // Replace with GenLayer chain ID
    chainName: 'GenLayer Testnet',
    nativeCurrency: {
      name: 'GEN',
      symbol: 'GEN',
      decimals: 18
    },
    rpcUrls: ['https://rpc.genlayer-testnet.com'], // Replace with actual RPC
    blockExplorerUrls: ['https://explorer.genlayer-testnet.com']
  },

  // Sepolia Testnet
  SEPOLIA: {
    chainId: '0xaa36a7', // 11155111 in hex
    chainName: 'Ethereum Sepolia Testnet',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH', 
      decimals: 18
    },
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com/89e4ff0f587fe2a94c7a2c12653f4c55d2bda1186cb6c1c95bd8d8408fbdc014',
      'https://rpc.sepolia.org'
    ],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },

  // Localhost for development
  LOCALHOST: {
    chainId: '0x7A69', // 31337 in hex
    chainName: 'Localhost 8545',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: []
  }
};

export const DEFAULT_CHAIN = SUPPORTED_CHAINS.SEPOLIA;
