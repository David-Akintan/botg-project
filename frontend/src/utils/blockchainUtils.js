// src/utils/blockchainUtils.js
import { ethers } from "ethers";

/**
 * Format time remaining as MM:SS
 */
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get stage name from contract stage number
 */
export const getStageName = (stageNumber) => {
  const stages = {
    0: "Lobby",
    1: "Starting",
    2: "Question 1",
    3: "Question 2",
    4: "Question 3",
    5: "Question 4",
    6: "Question 5",
    7: "Voting Q1",
    8: "Voting Q2",
    9: "Voting Q3",
    10: "Voting Q4",
    11: "Voting Q5",
    12: "Results",
    13: "Completed"
  };
  return stages[stageNumber] || "Unknown";
};

/**
 * Get question index from stage
 */
export const getQuestionIndex = (stageNumber) => {
  if (stageNumber >= 2 && stageNumber <= 6) {
    return stageNumber - 2;
  }
  if (stageNumber >= 7 && stageNumber <= 11) {
    return stageNumber - 7;
  }
  return 0;
};

/**
 * Check if stage is a question stage
 */
export const isQuestionStage = (stageNumber) => {
  return stageNumber >= 2 && stageNumber <= 6;
};

/**
 * Check if stage is a voting stage
 */
export const isVotingStage = (stageNumber) => {
  return stageNumber >= 7 && stageNumber <= 11;
};

/**
 * Safe contract call with error handling
 */
export const safeContractCall = async (fn, errorMessage) => {
  try {
    const tx = await fn();
    const receipt = await tx.wait();
    return { success: true, receipt };
  } catch (error) {
    console.error(errorMessage, error);
    
    let userMessage = errorMessage;
    
    if (error.message.includes('Already submitted')) {
      userMessage = 'You have already submitted your answer!';
    } else if (error.message.includes('Already voted')) {
      userMessage = 'You have already voted!';
    } else if (error.message.includes('Cannot vote for yourself')) {
      userMessage = 'You cannot vote for your own answer!';
    } else if (error.message.includes('Too short')) {
      userMessage = 'Answer is too short (minimum 20 characters)';
    } else if (error.message.includes('Too long')) {
      userMessage = 'Answer is too long (maximum 500 characters)';
    } else if (error.message.includes('Not in room')) {
      userMessage = 'You are not in this game room';
    } else if (error.message.includes('Invalid stage')) {
      userMessage = 'Cannot perform this action at this stage';
    } else if (error.message.includes('user rejected')) {
      userMessage = 'Transaction was rejected';
    }
    
    return { success: false, error, userMessage };
  }
};

/**
 * Wait for transaction with loading state
 */
export const waitForTransaction = async (tx, onUpdate) => {
  try {
    onUpdate?.({ status: 'pending', message: 'Transaction sent...' });
    
    const receipt = await tx.wait();
    
    onUpdate?.({ 
      status: 'success', 
      message: 'Transaction confirmed!',
      receipt 
    });
    
    return { success: true, receipt };
  } catch (error) {
    onUpdate?.({ 
      status: 'error', 
      message: 'Transaction failed',
      error 
    });
    
    return { success: false, error };
  }
};

/**
 * Parse error message from contract
 */
export const parseContractError = (error) => {
  if (error.data?.message) {
    return error.data.message;
  }
  
  if (error.message) {
    // Extract revert reason
    const match = error.message.match(/reason="([^"]+)"/);
    if (match) {
      return match[1];
    }
    
    // Extract execution reverted message
    const revertMatch = error.message.match(/execution reverted: ([^"]+)/);
    if (revertMatch) {
      return revertMatch[1];
    }
  }
  
  return 'Unknown error occurred';
};

/**
 * Format address for display
 */
export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Check if user has MetaMask
 */
export const hasMetaMask = () => {
  return typeof window.ethereum !== 'undefined';
};

/**
 * Request network switch
 */
export const switchNetwork = async (chainId) => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ethers.utils.hexValue(chainId) }],
    });
    return true;
  } catch (error) {
    console.error('Failed to switch network:', error);
    return false;
  }
};

/**
 * Add network to MetaMask
 */
export const addNetwork = async (networkConfig) => {
  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [networkConfig],
    });
    return true;
  } catch (error) {
    console.error('Failed to add network:', error);
    return false;
  }
};

/**
 * Network configurations
 */
export const NETWORKS = {
  LOCALHOST: {
    chainId: '0x7A69', // 31337
    chainName: 'Localhost',
    rpcUrls: ['http://127.0.0.1:8545'],
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  SEPOLIA: {
    chainId: '0xAA36A7', // 11155111
    chainName: 'Sepolia Testnet',
    rpcUrls: ['https://sepolia.infura.io/v3/YOUR_INFURA_KEY'],
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  POLYGON_MUMBAI: {
    chainId: '0x13881', // 80001
    chainName: 'Polygon Mumbai',
    rpcUrls: ['https://rpc-mumbai.maticvigil.com'],
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    blockExplorerUrls: ['https://mumbai.polygonscan.com']
  }
};

/**
 * Listen for account changes
 */
export const onAccountsChanged = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', callback);
  }
};

/**
 * Listen for chain changes
 */
export const onChainChanged = (callback) => {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', callback);
  }
};

/**
 * Remove event listeners
 */
export const removeListeners = () => {
  if (window.ethereum) {
    window.ethereum.removeAllListeners('accountsChanged');
    window.ethereum.removeAllListeners('chainChanged');
  }
};

/**
 * Get current network info
 */
export const getCurrentNetwork = async (provider) => {
  try {
    const network = await provider.getNetwork();
    return {
      chainId: network.chainId,
      name: network.name
    };
  } catch (error) {
    console.error('Failed to get network:', error);
    return null;
  }
};

/**
 * Check if player has submitted answer
 */
export const hasSubmittedAnswer = async (contract, roomId, questionIndex, playerAddress) => {
  try {
    const answer = await contract.getPlayerAnswer(roomId, questionIndex, playerAddress);
    return answer.submitted;
  } catch (error) {
    console.error('Failed to check answer status:', error);
    return false;
  }
};

/**
 * Check if player has voted
 */
export const hasVoted = async (contract, questionIndex, playerAddress) => {
  try {
    return await contract.hasVoted(questionIndex, playerAddress);
  } catch (error) {
    console.error('Failed to check vote status:', error);
    return false;
  }
};

/**
 * Get vote count for player
 */
export const getVoteCount = async (contract, questionIndex, playerAddress) => {
  try {
    const votes = await contract.getQuestionVotes(questionIndex, playerAddress);
    return votes.toNumber();
  } catch (error) {
    console.error('Failed to get vote count:', error);
    return 0;
  }
};