import React, { useEffect, useState } from "react";
import "../../styles/components/game/ConsensusPhase.css";
import { Trophy } from "lucide-react";

export default function ConsensusPhase({
  players = [],
  validatorScores = {},
  votes = {},
  onComplete,
  socket,
  roomInfo
}) {
  const [countdown, setCountdown] = useState(5);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);

  // Get question info from roomInfo
  useEffect(() => {
    if (roomInfo) {
      setQuestionIndex(roomInfo.currentQuestionIndex || 0);
      setTotalQuestions(roomInfo.totalQuestions || 5);
    }
  }, [roomInfo]);

  useEffect(() => {
  // Just show results for 5 seconds, server will handle progression
  const timer = setTimeout(() => {
    onComplete(computeFinalScores());
  }, 5000);

  return () => clearTimeout(timer);
}, [onComplete, players, validatorScores, votes]);

  const computeFinalScores = () => {
    // Calculate vote tallies
    const voteTallies = {};
    players.forEach((p) => {
      voteTallies[p.id] = 0;
    });

    Object.values(votes).forEach((votedId) => {
      if (voteTallies[votedId] !== undefined) {
        voteTallies[votedId]++;
      }
    });

    // Create final scores with vote info
    return players
      .map((player) => {
        const validatorScore = validatorScores[player.id];
        const avgValidator = validatorScore
          ? Math.round(
              (validatorScore.creativity +
                validatorScore.logic +
                validatorScore.persuasiveness) /
                3
            )
          : 0;

        const votesReceived = voteTallies[player.id] || 0;

        return {
          ...player,
          validatorScore: avgValidator,
          votesReceived: votesReceived,
          // XP is already updated on the server
        };
      })
      .sort((a, b) => (b.xp || 0) - (a.xp || 0));
  };

  const finalScores = computeFinalScores();
  const winner = finalScores[0];
  const isLastQuestion = questionIndex >= totalQuestions - 1;

  return (
    <div className="consensus-screen">
      <div className="consensus-card">
        <div className="consensus-header">
          <div className="question-progress">
            Question {questionIndex + 1} of {totalQuestions} - Results
          </div>
          <Trophy size={48} color="#f59e0b" />
          <h2>🎉 Results for Question {questionIndex + 1}!</h2>
          <p>Calculating scores...</p>
        </div>

        {winner && (
          <div className="winner-highlight">
            <div className="winner-avatar">{winner.avatar}</div>
            <h3 className="winner-name">{winner.name}</h3>
            <div className="winner-badge">🏆 Round Winner!</div>
            <div className="winner-stats">
              <div className="stat">
                <span className="stat-label">Votes</span>
                <span className="stat-value">{winner.votesReceived}</span>
              </div>
              <div className="stat">
                <span className="stat-label">AI Score</span>
                <span className="stat-value">{winner.validatorScore}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Total XP</span>
                <span className="stat-value">{winner.xp || 0}</span>
              </div>
            </div>
          </div>
        )}

        <div className="all-scores">
          <h4>Round {questionIndex + 1} Standings</h4>
          {finalScores.map((player, idx) => (
            <div key={player.id} className={`score-row ${idx === 0 ? 'top' : ''}`}>
              <div className="rank">
                {idx === 0 && "🥇"}
                {idx === 1 && "🥈"}
                {idx === 2 && "🥉"}
                {idx > 2 && `#${idx + 1}`}
              </div>
              <div className="player-info-row">
                <span className="avatar-small">{player.avatar}</span>
                <span className="name">{player.name}</span>
              </div>
              <div className="scores-detail">
                <span className="score-item">👍 {player.votesReceived}</span>
                <span className="score-item">🤖 {player.validatorScore}</span>
                <span className="score-item xp">💎 {player.xp || 0}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="countdown-footer">
          <p className="countdown-text">
            {isLastQuestion 
              ? `Moving to final leaderboard in ${countdown}s...`
              : `Next question in ${countdown}s...`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
