import React, { useEffect, useState } from "react";
import "../../styles/components/game/ValidatorPhase.css";
import { CheckCircle } from "lucide-react";

/**
 * 🎯 FIX #4: Now sends validator scores to server for synchronization
 */

export default function ValidatorPhase({ 
  argumentsData = [], 
  onComplete,
  socket,
  roomInfo 
}) {
  const [progress, setProgress] = useState(0);
  const [scoresMap, setScoresMap] = useState({});
  const [sentToServer, setSentToServer] = useState(false);

  useEffect(() => {
    // simulate processing with incremental progress
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.floor(Math.random() * 12) + 6;
        if (next >= 100) {
          clearInterval(interval);
          // compute scores
          const scores = {};
          argumentsData.forEach((arg) => {
            scores[arg.player.id] = {
              creativity: Math.floor(Math.random() * 30) + 70,
              logic: Math.floor(Math.random() * 30) + 70,
              persuasiveness: Math.floor(Math.random() * 30) + 70
            };
          });
          setScoresMap(scores);
          
          // 🎯 FIX #4: Send scores to server for synchronization
          if (socket && roomInfo && !sentToServer) {
            console.log("📤 Sending validator scores to server...");
            socket.emit("submitValidatorScores", {
              roomCode: roomInfo.id,
              scores: scores
            });
            setSentToServer(true);
          }
          
          // wait small pause then callback
          setTimeout(() => onComplete(scores), 1000);
        }
        return Math.min(next, 100);
      });
    }, 400);

    return () => clearInterval(interval);
  }, [argumentsData, onComplete, socket, roomInfo, sentToServer]);

  return (
    <div className="validator-screen">
      <div className="validator-card">
        <div className="validator-header">
          <div className="icon-wrap"><CheckCircle size={36} color="#10b981" /></div>
          <h2>AI Validators Analyzing...</h2>
          <p>Multiple LLM validators are scoring arguments on creativity, logic and persuasiveness.</p>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="validator-list">
          {argumentsData.map((arg) => (
            <div key={arg.player.id} className="validator-row">
              <div className="avatar">{arg.player.avatar}</div>
              <div className="player-info">
                <div className="player-name">{arg.player.name}</div>
                <div className="player-text">{arg.text.slice(0, 120)}{arg.text.length>120 ? "..." : ""}</div>
              </div>
              <div className="score-sample">
                {scoresMap[arg.player.id] ? Math.round((scoresMap[arg.player.id].creativity + scoresMap[arg.player.id].logic + scoresMap[arg.player.id].persuasiveness)/3) : "--"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}