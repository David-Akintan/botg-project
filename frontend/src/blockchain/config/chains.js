export const SUPPORTED_CHAINS = {
  // Sepolia Testnet
  SEPOLIA: {
    chainId: 11155111, // 11155111 in hex
    chainName: "Ethereum Sepolia Testnet",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: [
      "https://ethereum-sepolia-rpc.publicnode.com/89e4ff0f587fe2a94c7a2c12653f4c55d2bda1186cb6c1c95bd8d8408fbdc014",
      "https://rpc.sepolia.org",
    ],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },

  BASE_SEPOLIA: {
    chainId: 84532,
    chainName: "Base Sepolia Testnet",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
  },

  CELO_SEPOLIA: {
    chainId: 11142220,
    chainName: "Celo Sepolia Testnet",
    nativeCurrency: {
      name: "CELO",
      symbol: "CELO",
      decimals: 18,
    },
    rpcUrls: ["https://forno.celo-sepolia.celo-testnet.org"],
    blockExplorerUrls: ["https://sepolia.celoscan.io/"],
  },

  // Localhost for development
  LOCALHOST: {
    chainId: 31337, // 31337 in hex
    chainName: "Localhost 8545",
    nativeCurrency: {
      name: "Ethereum",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: ["http://127.0.0.1:8545"],
    blockExplorerUrls: [],
  },
};
