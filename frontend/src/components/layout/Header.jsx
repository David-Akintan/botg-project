import React, { useState } from "react";
import WalletConnect from "../blockchain/WalletConnect";
import { Menu, X } from "lucide-react";
import "../../styles/components/layout/Header.css";

export default function Header({ showWallet = true, onLogoClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    // Toggle body scroll
    if (!mobileMenuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    document.body.classList.remove("menu-open");
  };

  React.useEffect(() => {
    return () => {
      document.body.classList.remove("menu-open");
    };
  }, []);

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <div
            className="logo-section"
            onClick={onLogoClick}
            style={{ cursor: onLogoClick ? "pointer" : "default" }}
          >
            <div className="logo-icon">⚔️</div>
            <div className="logo-text">
              <h1>Battle of the Giants</h1>
              <span className="tagline">Debate. Vote. Conquer.</span>
            </div>
          </div>
        </div>

        {showWallet && (
          <>
            <div className="header-right desktop-only">
              <WalletConnect />
            </div>

            <button
              className="mobile-menu-btn mobile-only"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {mobileMenuOpen && (
              <div className="mobile-menu-overlay" onClick={closeMobileMenu}>
                <div
                  className="mobile-menu-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="mobile-menu-header">
                    <h3>Menu</h3>
                    <button
                      className="close-btn"
                      onClick={closeMobileMenu}
                      aria-label="Close menu"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="mobile-wallet-section">
                    <WalletConnect />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
