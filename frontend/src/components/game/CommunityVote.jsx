import React, { useState, useEffect } from "react";
import { useTransaction } from "../../blockchain/hooks/useTransaction";
import "../../styles/components/game/CommunityVote.css";
import { ThumbsUp } from "lucide-react";
import TimerDisplay from "../TimerDisplay";

export default function CommunityVote({
  argumentsData = [],
  players = [],
  validatorScores = {},
  currentPlayer,
  onComplete,
  socket,
  roomInfo,
  contract,
  account,
}) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [myVote, setMyVote] = useState(null);
  const [votesMap, setVotesMap] = useState({});
  const [voteTallies, setVoteTallies] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentTopic, setCurrentTopic] = useState("");

  const { executeTransaction, isPending } = useTransaction(socket, roomInfo);

  // ADD: Helper to get wallet address from socket ID
  const getWalletAddress = async (playerId) => {
    if (!contract || !roomInfo) return null;

    try {
      const address = await contract.getPlayerBySocket(roomInfo.id, playerId);
      return address;
    } catch (err) {
      console.error("Failed to get wallet address:", err);
      return null;
    }
  };

  // Get question info and topic from roomInfo
  useEffect(() => {
    if (roomInfo) {
      setQuestionIndex(roomInfo.votingQuestionIndex || 0);
      setTotalQuestions(roomInfo.totalQuestions || 5);
      // Get topic from the first argument's context or props
      if (argumentsData.length > 0 && argumentsData[0].topic) {
        setCurrentTopic(argumentsData[0].topic);
      }
    }
  }, [roomInfo, argumentsData]);

  // Reset state when new voting phase starts
  useEffect(() => {
    setMyVote(null);
    setSubmitted(false);
    setWaitingForOthers(false);
    setVoteCount(0);
    setTimeLeft(30);
  }, [questionIndex, argumentsData]);

  // Listen for vote submission updates
  useEffect(() => {
    if (!socket || !roomInfo) return;

    const handleVoteSubmitted = ({ voteCount: count, totalPlayers: total }) => {
      console.log(`📊 Votes: ${count}/${total}`);
      setVoteCount(count);
      setTotalPlayers(total);
    };

    socket.on("voteSubmitted", handleVoteSubmitted);

    return () => {
      socket.off("voteSubmitted", handleVoteSubmitted);
    };
  }, [socket, roomInfo]);

  // Timer countdown
  useEffect(() => {
    if (submitted || timeLeft <= 0) {
      if (timeLeft <= 0 && !submitted && !waitingForOthers) {
        handleTimeOut();
      }
      return;
    }

    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted, waitingForOthers]);

  const handleTimeOut = () => {
    console.log("⏰ Voting time expired!");
    if (!socket || !roomInfo) return;

    socket.emit("requestAllVotes", { roomCode: roomInfo.id });
    setWaitingForOthers(true);
  };

  // MODIFIED: Cast vote with blockchain
  const castVote = async (playerId) => {
    if (playerId === currentPlayer.id) {
      alert("Can't vote for yourself!");
      return;
    }

    if (submitted || isPending) return;

    console.log("🗳️ Submitting vote...");

    socket.emit("submitVote", {
        roomCode: roomInfo.id,
        votedForPlayerId: playerId,
      });

      setMyVote(playerId);
      setSubmitted(true);
      setWaitingForOthers(true);

    // Submit to blockchain in background
    if (contract && account && votedPlayerAddress) {
      try {
        console.log("🗳️ Also recording vote on blockchain...");
        contract.castVote(roomInfo.id, votedPlayerAddress)
          .then(tx => tx.wait())
          .then(() => console.log("✅ Vote recorded on blockchain"))
          .catch((err) => {
            console.error("❌ Vote failed:", err);
            alert("Vote failed. Try again.");
          });
      } catch (err) {
        console.error("❌ Vote failed:", err);
        alert("Vote failed. Try again.");
        return;
      }
    } else {
      // ⚡ Socket.IO fallback
      socket.emit("submitVote", {
        roomCode: roomInfo.id,
        votedForPlayerId: playerId,
      });

      setMyVote(playerId);
      setSubmitted(true);
      setWaitingForOthers(true);
    }
  };

  const submitVoteViaSocket = (playerId) => {
    socket.emit("submitVote", {
      roomCode: roomInfo.id,
      votedForPlayerId: playerId,
    });

    setMyVote(playerId);
    setSubmitted(true);
    setWaitingForOthers(true);
  };

  const finish = () => {
    if (myVote && !submitted) {
      castVote(myVote);
    } else if (!submitted) {
      alert("Please vote for an argument first!");
    }
  };

  return (
    <div className="community-screen">
      <div className="community-card">
        <div className="community-header">
          <div className="question-progress">
            Voting Phase - Question {questionIndex + 1} of {totalQuestions}
          </div>

          {/* ADD THIS: Display the topic being voted on */}
          <div className="voting-topic-display">
            <h4>Topic:</h4>
            <p>{currentTopic || "Loading topic..."}</p>
          </div>

          <h3>Vote for the Best Argument</h3>
          {!submitted && <TimerDisplay seconds={timeLeft} />}
        </div>

        <div className="arguments-list">
          {argumentsData.map((arg, idx) => {
            const voted = myVote === arg.player.id;
            const isMyArgument = arg.player.id === currentPlayer.id;
            // const aiScore = validatorScores[arg.player.id]
            //   ? Math.round((validatorScores[arg.player.id].creativity + validatorScores[arg.player.id].logic + validatorScores[arg.player.id].persuasiveness) / 3)
            //   : null;

            return (
              <div
                key={idx}
                className={`argument-row ${voted ? "voted" : ""} ${
                  isMyArgument ? "my-argument" : ""
                }`}
              >
                <div className="avatar">{arg.player.avatar}</div>
                <div className="arg-content">
                  <div className="arg-head">
                    <div className="player-name">
                      {arg.player.name}
                      {isMyArgument && <span className="you-badge">YOU</span>}
                    </div>
                    {/* {aiScore !== null && <div className="ai-score">AI: {aiScore}</div>} */}
                  </div>
                  <div className="arg-text">{arg.text}</div>
                  <div className="arg-actions">
                    <button
                      className={`vote-btn ${voted ? "voted-btn" : ""}`}
                      onClick={() => castVote(arg.player.id)}
                      disabled={isMyArgument || submitted || isPending}
                    >
                      <ThumbsUp size={14} />{" "}
                      {isPending
                        ? "Processing..."
                        : voted
                        ? "Voted"
                        : isMyArgument
                        ? "Your Argument"
                        : "Vote"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {submitted && (
          <div className="waiting-section">
            <div className="waiting-message">
              <div className="check-icon">✅</div>
              <h4>Vote Submitted!</h4>
              <p>Waiting for other players to vote...</p>

              <div className="vote-progress">
                <div className="progress-text">
                  {voteCount} / {totalPlayers} players have voted
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${
                        totalPlayers > 0 ? (voteCount / totalPlayers) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!submitted && (
          <div className="community-footer">
            <button className="finish-btn" onClick={finish} disabled={!myVote}>
              {" "}
              Submit Vote
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
