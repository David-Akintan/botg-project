import React, { useEffect } from "react";
import "../../styles/components/game/TopicReveal.css";

export default function TopicReveal({ topic, onReveal }) {
  useEffect(() => {
    // show topic for 3s then call onReveal to move to next stage
    const timer = setTimeout(() => {
      onReveal(topic);
    }, 3000);
    return () => clearTimeout(timer);
  }, [topic, onReveal]);

  return (
    <div className="topic-screen">
      <div className="topic-card">
        <div className="topic-emoji">🎯</div>
        <h2 className="topic-title">Question</h2>
        <div className="topic-box">{topic}</div>
        <p className="topic-sub">Prepare your answers...</p>
      </div>
    </div>
  );
}
