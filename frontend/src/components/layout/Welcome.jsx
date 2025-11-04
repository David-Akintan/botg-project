import React from "react";
import "../../styles/components/layout/Welcome.css";
import {
  MessageSquare,
  Users,
  Trophy,
  Zap,
  ArrowRight,
  Swords,
  SettingsIcon,
} from "lucide-react";

export default function Welcome({ onGetStarted }) {
  return (
    <div className="welcome-screen">
      <div className="welcome-container">
        {/* Hero Section */}
        <div className="welcome-hero">
          <div className="logo-large">
            <Swords size={64} />
          </div>
          <h1 className="welcome-title">Battle of the Giants</h1>
          <p className="welcome-tagline">The Ultimate Debate Arena</p>
          <p className="welcome-subtitle">Argue. Vote. Win. Powered by Base</p>
        </div>

        {/* How to Play Section */}
        <div className="how-to-play">
          <h2>🎮 How to Play</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Join or Create Room</h3>
                <p>
                  Create a new game room or join an existing one with a room
                  code
                </p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Answer 5 Questions</h3>
                <p>
                  Write persuasive arguments for 5 different debate topics (1
                  min each)
                </p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Vote on Best Arguments</h3>
                <p>
                  Review all answers and vote for the most convincing arguments
                  (30s per question)
                </p>
              </div>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>See Results & Win XP</h3>
                <p>Earn XP based on votes received. Climb the leaderboard!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          {/* <h2>✨ Features</h2> */}
          <h2>
            <SettingsIcon /> Features
          </h2>
          <div className="features-list">
            <div className="feature-item">
              <Users size={24} />
              <div>
                <strong>Multiplayer Action</strong>
                <p>Compete with up to 4 players per room</p>
              </div>
            </div>

            <div className="feature-item">
              <Zap size={24} />
              <div>
                <strong>Fast-Paced Rounds</strong>
                <p>Quick 8-minute games with rapid-fire debates</p>
              </div>
            </div>

            <div className="feature-item">
              <Trophy size={24} />
              <div>
                <strong>XP & Leaderboards</strong>
                <p>Earn points and compete for the top spot</p>
              </div>
            </div>

            <div className="feature-item">
              <MessageSquare size={24} />
              <div>
                <strong>AI-Powered</strong>
                <p>Intelligent bot players available for practice</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="cta-section">
          <button className="get-started-btn" onClick={onGetStarted}>
            Get Started <ArrowRight size={20} />
          </button>
          <p className="cta-hint">Ready to debate? Click to begin!</p>
        </div>

        {/* Footer Info */}
        <div className="welcome-footer">
          <p>🎯 Game Duration: ~8 minutes | 👥 Players: 2-4 | 💎 XP System</p>
        </div>
      </div>
    </div>
  );
}
