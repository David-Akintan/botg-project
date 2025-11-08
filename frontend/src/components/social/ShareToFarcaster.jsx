import React from "react";
import "../../styles/components/social/ShareToFarcaster.css";

export default function ShareToFarcaster({ score, rank, totalPlayers }) {
  const shareToFarcaster = () => {
    const text = encodeURIComponent(
      `🎮 Just played Battle of the Giants!\n\n` +
        `🏆 Rank: ${rank}/${totalPlayers}\n` +
        `⭐ Score: ${score} XP\n\n` +
        `Think you can beat me? 👇`
    );

    const url = encodeURIComponent(
      "https://botg-project.vercel.app/?source=farcaster"
    );
    const castUrl = `https://warpcast.com/~/compose?text=${text}&embeds[]=${url}`;

    window.open(castUrl, "_blank");
  };

  return (
    <button className="share-farcaster-btn" onClick={shareToFarcaster}>
      🟣 Share to Farcaster
    </button>
  );
}
