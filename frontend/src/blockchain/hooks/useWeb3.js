import { useState, useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { DEFAULT_CHAIN } from "../config/chains";
import { Toaster } from "react-hot-toast";

export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [hasShownToast, setHasShownToast] = useState(false);

  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      });
    } catch (switchError) {
      // Chain doesn't exist, add it
      if (switchError.code === 4902) {
        const chain = Object.values(SUPPORTED_CHAINS).find(
          (c) => c.chainId === targetChainId
        );

        if (chain) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [chain],
            });
          } catch (addError) {
            console.error("Failed to add network:", addError);
            toast.error("Failed to add Sepolia network.");
          }
        }
      } else {
        console.error("Failed to switch network:", switchError);
        toast.error("Failed to switch network.");
      }
    }
  };

  const connectWallet = async (isAutoConnect = false) => {
    if (!window.ethereum) {
      setError("Wallet not installed!");
      toast.error("Please install MetaMask to play this game!");
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Create provider and signer
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const web3Signer = await web3Provider.getSigner();
      const network = await web3Provider.getNetwork();
      console.log(`Connected to network: ${network.chainId} (${network.name})`);

      const currentChainId = `0x${network.chainId.toString(16)}`;

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
      setChainId(network.name.toUpperCase());

      if (
        currentChainId.toLowerCase() !== DEFAULT_CHAIN.chainId.toLowerCase()
      ) {
        if (!isAutoConnect) {
          // Only show toast if manual connect
          toast.error("You are not connected to the Sepolia test network.");
        }

        await switchNetwork(DEFAULT_CHAIN.chainId);
        return;
      }

      if (!hasShownToast || !isAutoConnect) {
        toast.success("✅ Connected to Sepolia network");
        setHasShownToast(true);
      }
      console.log("✅ Wallet connected:", accounts[0]);
    } catch (err) {
      console.error("❌ Wallet connection error:", err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    console.log("🔌 Wallet disconnected");
  };

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
        toast.error("Wallet disconnected! Please reconnect.");
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = async (newChainId) => {
      setChainId(newChainId);
      if (newChainId !== DEFAULT_CHAIN.chainId) {
        // alert("Please switch your network to Sepolia Testnet.");
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: DEFAULT_CHAIN.chainId }],
        });
      }
      // window.location.reload(); // Recommended by MetaMask
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // Auto-connect if previously connected
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
          await connectWallet(true);
        }
      } catch (err) {
        console.error("Auto-connect failed:", err);
      }
    };

    checkConnection();
  }, []);

  return {
    provider,
    signer,
    account,
    chainId,
    isConnecting,
    error,
    isConnected: !!account,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };
};
