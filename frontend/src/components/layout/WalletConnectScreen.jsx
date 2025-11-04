import React from "react";
import { useWeb3 } from "../../blockchain/hooks/useWeb3";
import "../../styles/components/layout/WalletConnectScreen.css";
import { Wallet, Shield, Zap } from "lucide-react";

export default function WalletConnectScreen({ onConnected }) {
  const { account, isConnecting, isConnected, connectWallet } = useWeb3();

  // Auto-proceed when connected
  React.useEffect(() => {
    if (isConnected && account) {
      setTimeout(() => {
        onConnected();
      }, 3000); // Small delay for UX
    }
  }, [isConnected, account, onConnected]);

  const handleConnect = async () => {
    await connectWallet();
  };

  return (
    <div className="wallet-connect-screen">
      <div className="wallet-connect-card">
        {!isConnected ? (
          <>
            <div className="wallet-icon-wrapper">
              <Wallet size={64} />
            </div>

            <h1>Connect Your Wallet</h1>
            <p className="wallet-subtitle">
              Connect your wallet to play Battle of the Giants and earn on-chain
              rewards
            </p>

            <div className="wallet-features">
              <div className="wallet-feature">
                <Shield size={20} />
                <div>
                  <strong>Secure & Trustless</strong>
                  <p>All game results stored on blockchain</p>
                </div>
              </div>

              <div className="wallet-feature">
                <Zap size={20} />
                <div>
                  <strong>Earn Real XP</strong>
                  <p>Your progress is permanently recorded</p>
                </div>
              </div>
            </div>

            <button
              className="connect-wallet-btn"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <span className="spinner-sm"></span>
                  Connecting...
                </>
              ) : (
                <>🦊 Connect Wallet</>
              )}
            </button>

            <div className="wallet-help">
              <p>Don't have Wallet?</p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="install-link"
              >
                Install MetaMask →
              </a>
            </div>
          </>
        ) : (
          <div className="wallet-connected-state">
            <div className="success-icon">✅</div>
            <h2>Wallet Connected!</h2>
            <p className="connected-address">
              {account.slice(0, 6)}...{account.slice(-4)}
            </p>
            <p className="redirect-message">Proceeding to game room...</p>
          </div>
        )}
      </div>
    </div>
  );
}
