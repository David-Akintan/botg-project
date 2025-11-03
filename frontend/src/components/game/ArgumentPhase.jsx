import React, { useState, useEffect, useRef } from "react";
import "../../styles/components/game/ArgumentPhase.css";
import TimerDisplay from "../TimerDisplay";
import { MessageSquare } from "lucide-react";
import { useTransaction } from "../../blockchain/hooks/useTransaction";

export default function ArgumentPhase({
  topic,
  players = [],
  currentPlayer,
  onSubmit,
  socket,
  roomInfo,
  contract,
  account,
}) {
  const [myArgument, setMyArgument] = useState("");
  const [timeLeft, setTimeLeft] = useState(60); // 1 minute
  const [submitted, setSubmitted] = useState(false);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);

  // ADD: Transaction hook
  const { executeTransaction, isPending } = useTransaction(socket, roomInfo);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (roomInfo) {
      setQuestionIndex(roomInfo.currentQuestionIndex || 0);
      setTotalQuestions(roomInfo.totalQuestions || 5);
    }
  }, [roomInfo]);

  useEffect(() => {
    if (roomInfo) {
      setQuestionIndex(roomInfo.currentQuestionIndex || 0);
      setTotalQuestions(roomInfo.totalQuestions || 5);
    }
  }, [roomInfo]);

  useEffect(() => {
    console.log("✅ ArgumentPhase mounted with:", {
      topic,
      roomCode: roomInfo?.id,
      timeLeft,
    });
  }, []);

  // Listen for answer submission updates
  useEffect(() => {
    // Safety check: Only run timer if we have room info and topic
    if (!roomInfo || !topic) {
      return;
    }

    if (submitted || timeLeft <= 0 || isPending) {
      if (timeLeft <= 0 && !submitted && !isPending && !waitingForOthers) {
        // ADD: && !waitingForOthers
        handleAutoSubmit();
      }
      return;
    }

    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted, isPending, waitingForOthers, roomInfo, topic]); // ADD: waitingForOthers

  const handleAutoSubmit = () => {
    console.log("🚨 handleAutoSubmit called!"); // ADD THIS
    console.log("State:", { submitted, isPending, waitingForOthers, timeLeft });
    if (submitted || isPending) return;

    const argumentText = myArgument.trim();

    // Don't auto-submit if the user hasn't written anything substantial
    if (argumentText.length === 0) {
      console.log(
        "⏰ Time's up but no argument written. Skipping auto-submit."
      );

      // Just mark as submitted to stop timer, but don't actually submit
      setSubmitted(true);
      setWaitingForOthers(true);

      // Notify server that this player didn't submit
      if (socket && roomInfo) {
        socket.emit("submitAnswer", {
          roomCode: roomInfo.id,
          answer: "(No response provided - time expired)",
        });
      }
      return;
    }

    // Auto-fill if user wrote something but it's too short
    let finalArgument = argumentText;
    if (finalArgument.length < 20) {
      finalArgument = finalArgument + " (auto-submitted due to time limit)";
      setMyArgument(finalArgument);
    }

    setTimeout(() => submitAnswer(finalArgument), 250);
  };

  // Timer countdown
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }

    // Safety check: Only run timer if we have room info and topic
    if (!roomInfo || !topic) {
      return;
    }

    if (submitted || timeLeft <= 0 || isPending) {
      if (timeLeft <= 0 && !submitted && !isPending) {
        handleAutoSubmit();
      }
      return;
    }

    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted, isPending, roomInfo, topic]);

  const submitAnswer = async (argumentText) => {
    if (!socket || !roomInfo || isPending) {
      console.error("❌ Socket, room info missing, or transaction pending!");
      return;
    }

    console.log("📤 Submitting answer to server...");

    socket.emit("submitAnswer", {
      roomCode: roomInfo.id,
      answer: argumentText,
    });

    setSubmitted(true);
    setWaitingForOthers(true);

    if (contract && account) {
      try {
        console.log("📝 Also recording answer on blockchain...");
        contract
          .submitArgument(roomInfo.id, argumentText)
          .then((tx) => tx.wait())
          .then(() => console.log("✅ Answer recorded on blockchain"))
          .catch((err) => {
            console.error("❌ Blockchain submission failed:", err);
            alert("Transaction failed. Please try again.");
          });
      } catch (err) {
        console.error("❌ Blockchain submission failed:", err);
        alert("Transaction failed. Please try again.");
        return;
      }
    } else {
      // ⚡ Fallback: Socket.IO only
      socket.emit("submitAnswer", {
        roomCode: roomInfo.id,
        answer: argumentText,
      });
    }

    // Send answer to server
    // socket.emit("submitAnswer", {
    //   roomCode: roomInfo.id,
    //   answer: argumentText
    // });

    // setSubmitted(true);
    // setWaitingForOthers(true);
  };

  const handleSubmitClick = () => {
    if (myArgument.trim().length < 20) {
      alert("Argument must be at least 20 characters!");
      return;
    }

    submitAnswer(myArgument.trim());
  };

  useEffect(() => {
    console.log("✅ ArgumentPhase mounted - resetting state");
    setMyArgument("");
    setSubmitted(false);
    setWaitingForOthers(false);
    setTimeLeft(60);
    setSubmissionCount(0);
    setTotalPlayers(0);
  }, [topic, roomInfo?.id]); // Reset when topic or room changes

  return (
    <div className="argument-screen">
      <div className="argument-card">
        <div className="argument-header">
          <div>
            <div className="question-progress">
              Answering Phase - Question {questionIndex + 1} of {totalQuestions}
            </div>
            <h3>Topic</h3>
            <div className="topic-inline">{topic}</div>
            <div className="meta-row">
              <span>
                <MessageSquare size={16} /> Write your answer below
              </span>
              {!submitted && !isPending && <TimerDisplay seconds={timeLeft} />}
            </div>
          </div>
        </div>

        {!submitted && !isPending ? (
          <>
            <textarea
              className="argument-textarea"
              placeholder="Write your persuasive argument here... Be creative, logical, and convincing!"
              value={myArgument}
              onChange={(e) => setMyArgument(e.target.value)}
              maxLength={500}
            />

            <div className="argument-footer">
              <div className="char-count">
                {myArgument.length}/500 characters
              </div>
              <button
                className="submit-arg-btn"
                onClick={handleSubmitClick}
                disabled={myArgument.trim().length < 20 || isPending}
              >
                Submit Answer
              </button>
            </div>

            <div className="tip-box">
              <strong>Tip:</strong> Answers are stored on the blockchain
              (immutable)
            </div>
          </>
        ) : isPending ? (
          <div className="waiting-section">
            <div className="submitted-message">
              <div className="spinner"></div>
              <h3>⏳ Submitting to Blockchain...</h3>
              <p>Please wait while your transaction is being processed...</p>
            </div>
          </div>
        ) : (
          <div className="waiting-section">
            <div className="submitted-message">
              <div className="check-icon">✅</div>
              <h3>Answer Submitted!</h3>
              <p>Waiting for other players to submit their answers...</p>

              <div className="submission-progress">
                <div className="progress-text">
                  {submissionCount} / {totalPlayers} players have submitted
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${
                        totalPlayers > 0
                          ? (submissionCount / totalPlayers) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="your-argument-preview">
                <strong>Your Argument:</strong>
                <p>{myArgument}</p>
              </div>
            </div>
          </div>
        )}

        {isPending && (
          <div className="blockchain-pending">
            <div className="spinner"></div>
            <h3>⛓️ Submitting to Blockchain...</h3>
            <p>Please confirm in MetaMask...</p>
          </div>
        )}
      </div>
    </div>
  );
}
