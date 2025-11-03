import React from "react";
import { Clock } from "lucide-react";

export default function TimerDisplay({ seconds }) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isWarning = seconds <= 10;

  return (
    <div className={`timer-display ${isWarning ? 'warning' : ''}`}>
      <Clock size={16} />
      <span>
        {minutes}:{secs.toString().padStart(2, '0')}
      </span>
    </div>
  );
}