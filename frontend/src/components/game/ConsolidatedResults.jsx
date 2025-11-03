import React, { useEffect, useState } from "react";
import "../../styles/components/game/ConsolidatedResults.css";
import { Trophy } from "lucide-react";

export default function ConsolidatedResults({ 
  allVotes = [],
  allAnswers = [],
  players = [],
  onComplete,
  socket,
  roomInfo 
}) {
  const [countdown, setCountdown] = useState(15); // 15 seconds to view all results

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          
          // Move to final leaderboard
          if (socket && roomInfo) {
            socket.emit("requestFinalLeaderboard", { roomCode: roomInfo.id });
          }
          onComplete();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete, socket, roomInfo]);

  // Calculate winner for each question
  const questionResults = allVotes.map((voteData, idx) => {
    const voteTallies = voteData.voteTallies;
    let maxVotes = Math.max(...Object.values(voteTallies));
    let winnerIds = Object.keys(voteTallies).filter(id => voteTallies[id] === maxVotes && maxVotes > 0);
    
    const winners = players.filter(p => winnerIds.includes(p.id));
    const topic = allAnswers[idx]?.topic || `Question ${idx + 1}`;

    return {
      questionIndex: idx,
      topic,
      winners,
      voteTallies
    };
  });

  // Overall winner (highest total XP)
  const sortedPlayers = [...players].sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const overallWinner = sortedPlayers[0];

  return (
    <div className="consolidated-results-screen">
      <div className="consolidated-results-card">
        <div className="results-header">
          <Trophy size={48} color="#f59e0b" />
          <h2>🎉 All Results Are In!</h2>
          <p>Here's how everyone performed across all 5 questions</p>
        </div>

        {/* Overall Winner Highlight */}
        {overallWinner && (
          <div className="overall-winner-section">
            <h3>🏆 OVERALL WINNER 🏆</h3>
            <div className="winner-card">
              <div className="winner-avatar-large">{overallWinner.avatar}</div>
              <h2 className="winner-name">{overallWinner.name}</h2>
              <div className="winner-xp">Total XP: {overallWinner.xp || 0}</div>
            </div>
          </div>
        )}

        {/* Question-by-Question Breakdown */}
        <div className="question-breakdown">
          <h3>Question-by-Question Breakdown</h3>
          {questionResults.map((result, idx) => (
            <div key={idx} className="question-result-item">
              <div className="question-header-row">
                <span className="question-number">Q{result.questionIndex + 1}</span>
                <span className="question-topic">{result.topic}</span>
              </div>
              <div className="question-winners">
                {result.winners.length > 0 ? (
                  result.winners.map(winner => (
                    <div key={winner.id} className="mini-winner">
                      <span className="mini-avatar">{winner.avatar}</span>
                      <span className="mini-name">{winner.name}</span>
                      <span className="mini-votes">
                        👍 {result.voteTallies[winner.id]} votes
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="no-winner">No votes received</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Final Standings */}
        <div className="final-standings-preview">
          <h3>Final Standings</h3>
          {sortedPlayers.slice(0, 5).map((player, idx) => (
            <div key={player.id} className={`standing-row ${idx === 0 ? 'top' : ''}`}>
              <div className="rank">
                {idx === 0 && "🥇"}
                {idx === 1 && "🥈"}
                {idx === 2 && "🥉"}
                {idx > 2 && `#${idx + 1}`}
              </div>
              <div className="player-info-mini">
                <span className="avatar-tiny">{player.avatar}</span>
                <span className="name">{player.name}</span>
              </div>
              <div className="xp-display">💎 {player.xp || 0} XP</div>
            </div>
          ))}
        </div>

        <div className="countdown-footer">
          <p className="countdown-text">Moving to final leaderboard in {countdown}s...</p>
        </div>
      </div>
    </div>
  );
}