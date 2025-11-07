import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ConsensusClashABI from "../contracts/ConsensusClash.json";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { SUPPORTED_CHAINS } from "../config/chains";

export const useContract = (signer, chainId) => {
  const [contract, setContract] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);

  useEffect(() => {
    if (!signer || !chainId) {
      setContract(null);
      setContractAddress(null);
      return;
    }

    try {
      const getCurrentChainId = () => {
        // Find which chain matches the chainId (which is the chain name)
        const chain = Object.entries(SUPPORTED_CHAINS).find(
          ([key, value]) => value.chainName === chainId
        );

        return chain ? chain[0] : null; // Returns "SEPOLIA", "BASE_SEPOLIA", etc.
      };

      const currentNetwork = getCurrentChainId();

      if (!currentNetwork) {
        console.error("❌ Unsupported network:", chainId);
        setContract(null);
        setContractAddress(null);
        return;
      }

      const address = CONTRACT_ADDRESSES[currentNetwork]?.BOTG;

      if (!address || address === "0x...") {
        console.error(
          "❌ Contract address not found for network:",
          currentNetwork
        );
        setContract(null);
        setContractAddress(null);
        return;
      }

      const contractInstance = new ethers.Contract(
        address,
        ConsensusClashABI,
        signer
      );

      setContract(contractInstance);
      setContractAddress(address);
      console.log(`✅ Contract connected on ${currentNetwork}:`, address);
    } catch (err) {
      console.error("❌ Contract connection failed:", err);
      setContract(null);
      setContractAddress(null);
    }
  }, [signer, chainId]);

  return { contract, contractAddress, isReady: !!contract };
};
