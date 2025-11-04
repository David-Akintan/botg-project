import React from "react";
import { useWeb3 } from "../../blockchain/hooks/useWeb3";
import "../../styles/components/blockchain/WalletConnect.css";

export default function WalletConnect({ onDisconnect }) {
  const {
    account,
    chainId,
    isConnecting,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
  } = useWeb3();

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnectWallet();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <div className="wallet-avatar">
            <img
              src={`https://api.dicebear.com/7.x/identicon/svg?seed=${account}`}
              alt="Avatar"
            />
          </div>
          <div className="wallet-details">
            <div className="wallet-address">{formatAddress(account)}</div>
            <div className="wallet-chain">Chain: {chainId}</div>
          </div>
        </div>
        <button className="wallet-disconnect-btn" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect-container">
      <button
        className="wallet-connect-btn"
        onClick={connectWallet}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <span className="spinner"></span>
            Connecting...
          </>
        ) : (
          <>🦊 Connect Wallet</>
        )}
      </button>
      {error && <div className="wallet-error">{error}</div>}
    </div>
  );
}
