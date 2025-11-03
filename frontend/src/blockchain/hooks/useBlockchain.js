// src/hooks/useBlockchain.js
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ABI, getContractAddress } from '../config/contractConfig';
import { 
  hasMetaMask, 
  onAccountsChanged, 
  onChainChanged, 
  removeListeners 
} from '../utils/blockchainUtils';

export const useBlockchain = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize connection
  const connect = useCallback(async () => {
    if (!hasMetaMask()) {
      setError('Please install MetaMask to play!');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Get provider and signer
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer = web3Provider.getSigner();
      const userAccount = await web3Signer.getAddress();
      const network = await web3Provider.getNetwork();
      console.log('🌐 Connected to network:', network.name, network.chainId);

      // Get contract address for this network
      const contractAddress = getContractAddress(network.chainId);

      // Initialize contract
      const gameContract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI,
        web3Signer
      );

      setProvider(web3Provider);
      setSigner(web3Signer);
      setContract(gameContract);
      setAccount(userAccount);
      setChainId(network.chainId);
      setConnected(true);

      console.log('✅ Connected:', userAccount);
      console.log('🌐 Network:', network.name, network.chainId);
      console.log('📝 Contract:', contractAddress);

      return true;
    } catch (err) {
      console.error('Connection failed:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount('');
    setChainId(null);
    setConnected(false);
    console.log('🔌 Disconnected');
  }, []);

  // Handle account changes
  useEffect(() => {
    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== account) {
        console.log('👤 Account changed:', accounts[0]);
        setAccount(accounts[0]);
        // Reconnect with new account
        connect();
      }
    };

    const handleChainChanged = () => {
      console.log('🌐 Chain changed, reloading...');
      window.location.reload();
    };

    onAccountsChanged(handleAccountsChanged);
    onChainChanged(handleChainChanged);

    return () => {
      removeListeners();
    };
  }, [account, connect, disconnect]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (hasMetaMask()) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connect();
        }
      }
    };

    autoConnect();
  }, []);

  return {
    provider,
    signer,
    contract,
    account,
    chainId,
    connected,
    loading,
    error,
    connect,
    disconnect
  };
};