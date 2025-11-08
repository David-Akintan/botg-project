import { React, useState, useEffect } from "react";
import { useWeb3 } from "../../blockchain/hooks/useWeb3";
import { useFarcaster } from "../../blockchain/hooks/useFarcaster";
import "../../styles/components/layout/WalletConnectScreen.css";
import { Wallet, Shield, Zap } from "lucide-react";

export default function WalletConnectScreen({ onConnected }) {
  const { account, isConnecting, isConnected, connectWallet } = useWeb3();
  const {
    farcasterUser,
    isLoading: isFarcasterLoading,
    isConnected: isFarcasterConnected,
    connectFarcaster,
  } = useFarcaster();
  const [authMethod, setAuthMethod] = useState(null);

  // Auto-proceed when connected
  useEffect(() => {
    if (isConnected && account) {
      setAuthMethod("metamask");
      setTimeout(() => {
        onConnected({ type: "wallet", account });
      }, 3000); // Small delay for UX
    }
  }, [isConnected, account, onConnected]);

  // Auto-proceed when Farcaster connected
  useEffect(() => {
    if (isFarcasterConnected && farcasterUser) {
      setAuthMethod("farcaster");
      setTimeout(() => {
        onConnected({
          type: "farcaster",
          farcasterUser,
          account: null, // No wallet address for Farcaster-only auth
        });
      }, 2000);
    }
  }, [isFarcasterConnected, farcasterUser, onConnected]);

  const handleMetaMaskConnect = async () => {
    setAuthMethod("metamask");
    await connectWallet();
  };

  const handleFarcasterConnect = async () => {
    setAuthMethod("farcaster");
    await connectFarcaster();
  };

  // Show loading/success state
  const isAnyConnecting = isConnecting || isFarcasterLoading;
  const isAnyConnected = isConnected || isFarcasterConnected;

  return (
    <div className="wallet-connect-screen">
      <div className="wallet-connect-card">
        {!isAnyConnected ? (
          <>
            <div className="wallet-icon-wrapper">
              <Wallet size={64} />
            </div>

            <h1>Connect Your Wallet</h1>
            <p className="wallet-subtitle">
              Connect your wallet or Farcaster account to play Battle of the
              Giants and earn on-chain rewards
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
            {/* Auth Options */}
            <div className="auth-options">
              <button
                className="connect-wallet-btn metamask-btn"
                onClick={handleMetaMaskConnect}
                disabled={isAnyConnecting}
              >
                {isConnecting && authMethod === "metamask" ? (
                  <>
                    <span className="spinner-sm"></span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🦊</span>
                    <span className="btn-content">
                      <span className="btn-title">Connect Wallet</span>
                    </span>
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="auth-divider">
                <span>OR</span>
              </div>

              {/* Farcaster Button */}
              <button
                className="connect-wallet-btn farcaster-btn"
                onClick={handleFarcasterConnect}
                disabled={isAnyConnecting}
              >
                {isFarcasterLoading && authMethod === "farcaster" ? (
                  <>
                    <span className="spinner-sm"></span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">🟣</span>
                    <span className="btn-content">
                      <span className="btn-title">Sign in with Farcaster</span>
                      <span className="btn-subtitle">Social login</span>
                    </span>
                  </>
                )}
              </button>
            </div>

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
            <h2>
              {authMethod === "farcaster"
                ? "Farcaster Connected!"
                : "Wallet Connected!"}
            </h2>

            {authMethod === "metamask" && (
              <p className="connected-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            )}
            {authMethod === "farcaster" && farcasterUser && (
              <div className="farcaster-user-info">
                {farcasterUser.pfpUrl && (
                  <img
                    src={farcasterUser.pfpUrl}
                    alt="Profile"
                    className="farcaster-pfp"
                  />
                )}
                <p className="farcaster-username">@{farcasterUser.username}</p>
              </div>
            )}
            <p className="redirect-message">Proceeding to game room...</p>
          </div>
        )}
      </div>
    </div>
  );
}
