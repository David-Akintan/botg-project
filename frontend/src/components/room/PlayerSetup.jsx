import React, { useState } from "react";
import "../../styles/components/room/PlayerSetup.css";
import { useWeb3 } from "../../blockchain/hooks/useWeb3";
import { useContract } from "../../blockchain/hooks/useContract";

export default function PlayerSetup({ onComplete, account }) {
  const [playerName, setPlayerName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const avatars = ["🐱", "🦊", "🐸", "🐼", "🐵", "🐯"];

   const { signer, account: walletAccount, isConnected } = useWeb3();
  const { contract, isReady } = useContract(signer);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState("");

  const handleStart = async () => {
    if (!playerName.trim() || !selectedAvatar) {
      alert("Please enter a name and select an avatar!");
      return;
    }

    const playerData = { 
      name: playerName, 
      avatar: selectedAvatar, 
      walletAddress: walletAccount || account 
    };

    // Check if blockchain is available
    if (!contract || !walletAccount) {
      console.log("⚠️ Blockchain not available, skipping registration");
      onComplete(playerData);
      return;
    }

    // Register on blockchain
    setIsRegistering(true);
    setRegistrationStatus("Checking registration...");

    try {
      // Check if already registered
      console.log("🔍 Checking if player is registered...");
      const playerInfo = await contract.registeredPlayers(walletAccount);
      
      if (playerInfo.registered) {
        console.log("✅ Player already registered on blockchain");
        setRegistrationStatus("Already registered!");
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRegistering(false);
        onComplete(playerData);
        return;
      }

      // Register new player
      console.log("📝 Registering player on blockchain...");
      setRegistrationStatus("Registering on blockchain...");
      
      const tx = await contract.registerPlayer(playerName, selectedAvatar);
      
      setRegistrationStatus("Waiting for confirmation...");
      console.log("⏳ Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      
      console.log(`✅ Player registered! Block: ${receipt.blockNumber}`);
      setRegistrationStatus("Registration complete!");
      
      // Wait a moment to show success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setIsRegistering(false);
      onComplete(playerData);

    } catch (err) {
      console.error("❌ Blockchain registration failed:", err);
      setIsRegistering(false);
      
      const errorMessage = err.reason || err.message || "Unknown error";
      const proceed = window.confirm(
        `Blockchain registration failed: ${errorMessage}\n\nContinue without blockchain registration?`
      );
      
      if (proceed) {
        onComplete(playerData);
      }
    }
  };

  return (
    <div className="player-setup-container">
      <div className="player-setup-content">
        <h2>👤 Player Setup</h2>

        <div className="input-section">
          <label>Enter your player name:</label>
          <input
            type="text"
            placeholder="e.g., CryptoNinja"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
          />
        </div>

        <div className="avatar-section">
          <label>Select an avatar:</label>
          <div className="avatar-list">
            {avatars.map((a) => (
              <div
                key={a}
                className={`avatar-item ${selectedAvatar === a ? "selected" : ""}`}
                onClick={() => setSelectedAvatar(a)}
              >
                {a}
              </div>
            ))}
          </div>
        </div>

        <button 
          className="start-btn" 
          onClick={handleStart}
          disabled={!playerName.trim() || !selectedAvatar || isRegistering}
        >
          {isRegistering ? "Registering..." : "Continue"}
        </button>

        {isRegistering && (
          <div className="blockchain-popup-overlay">
            <div className="blockchain-popup">
              <div className="blockchain-spinner"></div>
              <h3>⛓️ Blockchain Registration</h3>
              <p>{registrationStatus}</p>
              <small>Please confirm the transaction in your wallet...</small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}