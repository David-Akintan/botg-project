import { useState, useEffect } from "react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { SUPPORTED_CHAINS } from "../config/chains";

const TARGET_NETWORK = "SEPOLIA";
export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [hasShownToast, setHasShownToast] = useState(false);

  const targetChain = SUPPORTED_CHAINS[TARGET_NETWORK];
  const targetChainIdHex = `0x${targetChain.chainId.toString(16)}`;

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
          (c) => `0x${c.chainId.toString(16)}` === targetChainId
        );

        if (chain) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetChainId,
                  chainName: chain.chainName,
                  nativeCurrency: chain.nativeCurrency,
                  rpcUrls: chain.rpcUrls,
                  blockExplorerUrls: chain.blockExplorerUrls,
                },
              ],
            });
            return true;
          } catch (addError) {
            console.error("Failed to add network: ", addError);
            toast.error(`Failed to add ${chain.chainName}.`);
            return false;
          }
        }
      } else {
        console.error("Failed to switch network:", switchError);
        toast.error("Failed to switch network.");
        return false;
      }
    }
  };

  const getChainName = (chainIdDecimal) => {
    const chain = Object.values(SUPPORTED_CHAINS).find(
      (c) => c.chainId === chainIdDecimal
    );
    return chain ? chain.chainName : `Chain ${chainIdDecimal}`;
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

      const currentChainIdDecimal = Number(network.chainId);
      const currentChainIdHex = `0x${currentChainIdDecimal.toString(16)}`;
      const currentChainName = getChainName(currentChainIdDecimal);

      console.log(
        `Connected to network: ${currentChainIdDecimal} (${currentChainName})`
      );

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
      setChainId(currentChainName);

      if (currentChainIdDecimal !== targetChain.chainId) {
        if (!isAutoConnect) {
          toast.error(
            `⚠️ You are connected to ${currentChainName}. Please switch to ${targetChain.chainName}.`,
            { duration: 5000 }
          );
        }

        const switched = await switchNetwork(targetChainIdHex);
        if (!switched && !isAutoConnect) {
          toast.error(
            `Please manually switch to ${targetChain.chainName} in your wallet.`,
            { duration: 5000 }
          );
        }
        return;
      }

      // User is on the correct network
      if (!hasShownToast || !isAutoConnect) {
        toast.success(`✅ Connected to ${targetChain.chainName}`);
        setHasShownToast(true);
      }
      console.log("✅ Wallet connected:", accounts[0]);
    } catch (err) {
      console.error("❌ Wallet connection error:", err);
      setError(err.message);
      if (!isAutoConnect) {
        toast.error("Failed to connect wallet. Please try again.");
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setHasShownToast(false);
    toast.success("🔌 Wallet disconnected");
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
        toast.success("👤 Account changed.");
        console.log("👤 Account changed to:", accounts[0]);
      }
    };

    const handleChainChanged = (newChainIdIndex) => {
      const newChainIdDecimal = parseInt(newChainIdIndex, 16);
      const newChainName = getChainName(newChainIdDecimal);

      console.log(
        `🌐 Chain changed to: ${newChainIdDecimal} (${newChainName})`
      );
      setChainId(newChainName);

      if (newChainIdDecimal !== targetChain.chainId) {
        toast.error(
          `⚠️ You switched to ${newChainName}. Please switch back to ${targetChain.chainName}.`,
          { duration: 5000 }
        );

        setTimeout(() => {
          const shouldSwitch = window.confirm(
            `You are currently on ${newChainName}.\n\nThis app requires ${targetChain.chainName}.\n\nWould you like to switch now?`
          );

          if (!shouldSwitch) {
            switchNetwork(targetChainIdHex).catch((err) => {
              console.error("Failed to switch network:", err);
            });
          }
        }, 1000);
      } else {
        toast.success(`✅ Switched to ${targetChain.chainName}`);
      }
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
    targetNetwork: TARGET_NETWORK,
    targetChain,
  };
};
