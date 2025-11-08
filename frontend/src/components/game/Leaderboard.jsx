// src/components/Leaderboard.jsx
import React from "react";
import "../../styles/components/game/Leaderboard.css";
import ShareToFarcaster from "../social/ShareToFarcaster";

export default function Leaderboard({ finalScores, onPlayAgain }) {
  // Sort scores by XP in descending order
  const sortedScores = [...finalScores].sort(
    (a, b) => (b.xp || 0) - (a.xp || 0)
  );
  const currentPlayer = finalScores[0]; // Adjust to find actual current player
  const rank = finalScores.findIndex((p) => p.id === currentPlayer?.id) + 1;

  return (
    <div className="leaderboard-root">
      <div className="leaderboard-card">
        <h2>🏆 Leaderboard</h2>
        {sortedScores.length === 0 ? (
          <div className="empty">No leaderboard data yet</div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {sortedScores.map((p, i) => (
                <tr key={p.id || i} className={i === 0 ? "top" : ""}>
                  <td className="rank-cell">
                    {i === 0 && "🥇"}
                    {i === 1 && "🥈"}
                    {i === 2 && "🥉"}
                    {i > 2 && i + 1}
                  </td>
                  <td className="player-cell">
                    <span className="avatar-sm">{p.avatar || "🙂"}</span>
                    <span>{p.name}</span>
                  </td>
                  <td className="xp-cell">{p.xp || 0} XP</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="leaderboard-actions">
          <button
            className="btn back-btn"
            onClick={() => onPlayAgain && onPlayAgain()}
          >
            ← Back to Game Room
          </button>
        </div>
      </div>

      <div className="leaderboard-actions">
        <ShareToFarcaster
          score={currentPlayer?.xp || 0}
          rank={rank}
          totalPlayers={finalScores.length}
        />

        <button className="play-again-btn" onClick={onPlayAgain}>
          🔄 Play Again
        </button>
      </div>
    </div>
  );
}
