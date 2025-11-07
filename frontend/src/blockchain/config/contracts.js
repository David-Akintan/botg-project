export const CONTRACT_ADDRESSES = {
  LOCALHOST: {
    BOTG: "0x...", // Will be set after deployment
  },
  SEPOLIA: {
    BOTG: "0x552936d5B337588b5e19637d3CBe70388EED4e79", // Sepolia deployment
  },
  BASE_SEPOLIA: {
    BOTG: "0x552936d5B337588b5e19637d3CBe70388EED4e79", // Base_Sepolia deployment
  },
};

export const getContractAddress = (chainId) => {
  const chainName = chainId === "0xaa36a7" ? "SEPOLIA" : "LOCALHOST";
  return CONTRACT_ADDRESSES[chainName].BOTG;
};
