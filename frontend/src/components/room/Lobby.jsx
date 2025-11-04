import React from "react";
import "../../styles/components/room/Lobby.css";
import { MessageSquare, Users, Clock, Brain, Zap } from "lucide-react";

export default function Lobby({ onStart, currentPlayer }) {
  return (
    <div className="lobby-screen">
      <div className="lobby-card">
        <div className="lobby-header">
          <div className="logo-circle">
            <MessageSquare size={48} color="#fff" />
          </div>
          <h1 className="title">Battle of the Giants</h1>
          <p className="subtitle">The Debate Arena — Powered by Base</p>
        </div>

        <div className="lobby-features">
          <div className="feature">
            <Users size={16} /> 5-10 players per room
          </div>
          <div className="feature">
            <Clock size={16} /> 5-10 minute rounds
          </div>
          <div className="feature">
            <Brain size={16} /> AI validators judge arguments
          </div>
          <div className="feature">
            <Zap size={16} /> Earn XP and climb the leaderboard
          </div>
        </div>

        <button className="lobby-start" onClick={onStart}>
          Start Game
        </button>

        <div className="playing-as">
          Playing as:{" "}
          <span className="player-inline">
            {currentPlayer.avatar} {currentPlayer.name}
          </span>
        </div>
      </div>
    </div>
  );
}
