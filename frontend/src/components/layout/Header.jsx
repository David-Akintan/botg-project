import React from "react";
import WalletConnect from "../blockchain/WalletConnect";
import "../../styles/components/layout/Header.css";

export default function Header({
  showWallet = true,
  onDisconnect,
  onLogoClick,
}) {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div className="logo-section">
            <div className="logo-icon">⚔️</div>
            <div className="logo-text">
              <h1>Battle of the Giants</h1>
              <span className="tagline">Debate. Vote. Conquer.</span>
            </div>
          </div>
        </div>

        {showWallet && (
          <div className="header-right">
            <WalletConnect onDisconnect={onDisconnect} />
          </div>
        )}
      </div>
    </header>
  );
}
