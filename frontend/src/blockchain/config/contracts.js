export const CONTRACT_ADDRESSES = {
  LOCALHOST: {
    CONSENSUS_CLASH: '0x...' // Will be set after deployment
  },
  GENLAYER_TESTNET: {
    CONSENSUS_CLASH: '0x...' // Will be set after deployment to GenLayer
  },
  SEPOLIA: {
    CONSENSUS_CLASH: '0x552936d5B337588b5e19637d3CBe70388EED4e79' // Sepolia deployment
  }
};

export const getContractAddress = (chainId) => {
  const chainName = chainId === '0xaa36a7' ? 'LOCALHOST' : 'GENLAYER_TESTNET';
  return CONTRACT_ADDRESSES[chainName].CONSENSUS_CLASH;
};