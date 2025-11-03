import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import ConsensusClashABI from '../contracts/ConsensusClash.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;

export const useContract = (signer) => {
  const [contract, setContract] = useState(null);

  useEffect(() => {
    if (!signer || !CONTRACT_ADDRESS) {
      setContract(null);
      return;
    }

    try {
      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        ConsensusClashABI,
        signer
      );

      setContract(contractInstance);
      console.log('✅ Contract connected:', CONTRACT_ADDRESS);
    } catch (err) {
      console.error('❌ Contract connection failed:', err);
    }
  }, [signer]);

  return { contract, isReady: !!contract };
};