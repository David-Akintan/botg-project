import React, { useState, useEffect } from "react";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";

import io from "socket.io-client";
import { GameStage } from "./utils/constants";
import { MOCK_PLAYERS } from "./data";

import Header from "./components/layout/Header";
import RoomSelect from "./components/room/RoomSelect";
import PlayerSetup from "./components/room/PlayerSetup";
import Dashboard from "./components/room/Dashboard";
import Lobby from "./components/room/Lobby";
import TopicReveal from "./components/game/TopicReveal";
import ArgumentPhase from "./components/game/ArgumentPhase";
import ValidatorPhase from "./components/game/ValidatorPhase";
import CommunityVote from "./components/game/CommunityVote";
import Leaderboard from "./components/game/Leaderboard";
import ConsolidatedResults from "./components/game/ConsolidatedResults";
import Welcome from "./components/layout/Welcome";
import WalletConnectScreen from "./components/layout/WalletConnectScreen";

import { useWeb3 } from "./blockchain/hooks/useWeb3";
import { useContract } from "./blockchain/hooks/useContract";
import WalletConnect from "./components/blockchain/WalletConnect";
import TransactionNotification from "./components/blockchain/TransactionNotification";

import "./styles/App.css";
// import "./styles/SharedComponents.css";

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:4000", {
  transports: ["websocket"],
  withCredentials: true,
});

const CustomToast = ({ message, actionLabel, onAction, type = "info" }) => {
  const bg =
    type === "error"
      ? "bg-red-500/10 border border-red-500/30"
      : type === "success"
      ? "bg-green-500/10 border border-green-500/30"
      : "bg-zinc-800/60 border border-zinc-700";

  return (
    <div
      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl ${bg} text-sm`}
    >
      <span>{message}</span>
      {actionLabel && (
        <Button
          onClick={onAction}
          size="sm"
          className="ml-3 bg-white/10 hover:bg-white/20"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default function App() {
  const [stage, setStage] = useState(GameStage.WELCOME);
  const [roomInfo, setRoomInfo] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [topic, setTopic] = useState("");
  const [argumentsData, setArgumentsData] = useState([]);
  const [validatorScores, setValidatorScores] = useState({});
  const [votes, setVotes] = useState({});
  const [finalScores, setFinalScores] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [simulateMode, setSimulateMode] = useState(false);
  const [hostRoomInfo, setHostRoomInfo] = useState(null);
  const [showDisconnectPrompt, setShowDisconnectPrompt] = useState(false);

  const { signer, account, isConnected } = useWeb3();
  const { contract, isReady } = useContract(signer);

  useEffect(() => {
    console.log("🎮 Current stage:", stage);
    console.log("🏠 Room info:", roomInfo);
  }, [stage, roomInfo]);

  // Check if user came from Farcaster frame
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get("source");

    if (source === "farcaster") {
      console.log("🟣 User came from Farcaster!");
      // Track this for analytics
    }
  }, []);

  // Join blockchain room when player joins via Socket.IO
  useEffect(() => {
    const joinBlockchainRoom = async () => {
      if (!contract || !account || !roomInfo || !currentPlayer) return;

      try {
        console.log(`🔍 Checking blockchain room ${roomInfo.id}...`);

        // Check if room exists
        const exists = await contract.roomExists(roomInfo.id);
        if (!exists) {
          console.log(
            "⚠️ Room doesn't exist on blockchain yet. Will join when host creates it."
          );
          return;
        }

        // Check if already in room
        const players = await contract.getRoomPlayers(roomInfo.id);
        const alreadyInRoom = players.some(
          (p) => p.toLowerCase() === account.toLowerCase()
        );

        if (alreadyInRoom) {
          console.log(`✅ Already in blockchain room ${roomInfo.id}`);
          return;
        }

        // Join the room
        console.log(`🚪 Joining blockchain room ${roomInfo.id}...`);
        const tx = await contract.joinGameRoom(roomInfo.id);
        await tx.wait();
        console.log(`✅ Joined blockchain room!`);
      } catch (err) {
        console.error("Failed to join blockchain room:", err);
      }
    };

    // Delay to ensure room is created first
    const timer = setTimeout(joinBlockchainRoom, 2000);
    return () => clearTimeout(timer);
  }, [contract, account, roomInfo, currentPlayer]);

  // Join blockchain room when player joins via Socket.IO
  useEffect(() => {
    const joinBlockchainRoom = async () => {
      if (!contract || !account || !roomInfo || !currentPlayer) {
        console.log("⚠️ Missing requirements for blockchain room join");
        return;
      }

      try {
        console.log(`🔍 Checking blockchain room ${roomInfo.id}...`);

        // Wait a bit to ensure room is created by host
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if room exists
        const exists = await contract.roomExists(roomInfo.id);
        if (!exists) {
          console.log(
            "⚠️ Room doesn't exist on blockchain yet. Waiting for host to create it..."
          );

          // Retry after delay
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const existsRetry = await contract.roomExists(roomInfo.id);
          if (!existsRetry) {
            console.log(
              "⚠️ Room still doesn't exist. Host needs to start the game to create it."
            );
            return;
          }
        }

        console.log("✅ Room exists on blockchain");

        // Check if already in room
        const players = await contract.getRoomPlayers(roomInfo.id);
        console.log("Current blockchain players:", players);

        const alreadyInRoom = players.some(
          (p) => p.toLowerCase() === account.toLowerCase()
        );

        if (alreadyInRoom) {
          console.log(`✅ Already in blockchain room ${roomInfo.id}`);
          return;
        }

        // Join the room
        console.log(`🚪 Joining blockchain room ${roomInfo.id}...`);
        const tx = await contract.joinGameRoom(roomInfo.id);
        console.log("⏳ Waiting for join transaction...");
        await tx.wait();
        console.log(`✅ Joined blockchain room!`);
      } catch (err) {
        console.error("❌ Failed to join blockchain room:", err);
        console.log(
          "Game will continue in Socket.IO-only mode for this player"
        );
      }
    };

    // Run with delay to allow player setup to complete
    const timer = setTimeout(joinBlockchainRoom, 3000);
    return () => clearTimeout(timer);
  }, [contract, account, roomInfo, currentPlayer]);

  useEffect(() => {
    const storedHostRoom = localStorage.getItem("hostRoomInfo");
    if (storedHostRoom) {
      try {
        const parsed = JSON.parse(storedHostRoom);
        console.log("🔍 Found stored host room:", parsed);
        setHostRoomInfo(parsed);
      } catch (e) {
        console.error("Failed to parse host room info:", e);
        localStorage.removeItem("hostRoomInfo");
      }
    }
  }, []);

  useEffect(() => {
    socket.on("roomsUpdated", (updatedRooms) => {
      console.log("📋 Rooms updated:", updatedRooms);
      setRooms(updatedRooms);

      if (hostRoomInfo) {
        const roomStillExists = updatedRooms.find(
          (r) => r.id === hostRoomInfo.roomCode
        );
        if (!roomStillExists) {
          console.log("⚠️ Host's room no longer exists, clearing localStorage");
          localStorage.removeItem("hostRoomInfo");
          setHostRoomInfo(null);
        }
      }
    });

    socket.on("roomJoined", (data) => {
      console.log("✅ Room joined successfully:", data.room);
      setRoomInfo(data.room);
      setPlayers(data.room.players);

      if (data.isHost) {
        const hostInfo = {
          roomCode: data.room.id,
          socketId: socket.id,
          timestamp: Date.now(),
        };
        localStorage.setItem("hostRoomInfo", JSON.stringify(hostInfo));
        setHostRoomInfo(hostInfo);
        console.log("💾 Saved host room info to localStorage:", hostInfo);
      }

      setStage(GameStage.PLAYER_SETUP);
    });

    socket.on("playerJoined", (updatedRoom) => {
      console.log("👥 Player joined room:", updatedRoom);
      if (roomInfo && updatedRoom.id === roomInfo.id) {
        setPlayers(updatedRoom.players);
        setRoomInfo(updatedRoom);
      }
    });

    socket.on("errorMessage", (message) => {
      console.error("❌ Server error:", message);
      toast.error(message);
    });

    socket.on("roomEnded", ({ message }) => {
      console.log("🛑 Room ended:", message);
      toast.error(message);

      if (hostRoomInfo) {
        localStorage.removeItem("hostRoomInfo");
        setHostRoomInfo(null);
      }

      setRoomInfo(null);
      setCurrentPlayer(null);
      setPlayers([]);
      setStage(GameStage.ROOM_SELECT);
    });

    socket.on("hostTransferred", ({ newHostId, message }) => {
      console.log("👑 Host transferred:", newHostId);

      if (newHostId === socket.id && roomInfo) {
        const hostInfo = {
          roomCode: roomInfo.id,
          socketId: socket.id,
          timestamp: Date.now(),
        };
        localStorage.setItem("hostRoomInfo", JSON.stringify(hostInfo));
        setHostRoomInfo(hostInfo);
        console.log("💾 New host saved to localStorage:", hostInfo);
      }

      if (hostRoomInfo && newHostId !== socket.id) {
        localStorage.removeItem("hostRoomInfo");
        setHostRoomInfo(null);
        console.log("🗑️ Removed host info from localStorage");
      }
    });

    // 🎯 Listen for game countdown
    socket.on("gameStartCountdown", ({ countdown }) => {
      console.log("⏰ Game countdown started:", countdown);
      // Dashboard handles the countdown display
    });

    // 🎯 Game starts - move to Topic Reveal
    socket.on(
      "gameStarting",
      ({ topic: serverTopic, questionIndex, totalQuestions }) => {
        console.log(
          `🎮 Game starting - Question ${questionIndex + 1}/${totalQuestions}`
        );
        console.log(`🎯 Topic: ${serverTopic}`);
        setTopic(serverTopic);
        setStage(GameStage.TOPIC_REVEAL);
      }
    );

    // 🎯 All answers received - move to Validator
    socket.on("allAnswersReceived", ({ argumentsData }) => {
      console.log("📝 All answers received, moving to validation");
      setArgumentsData(argumentsData);
      setStage(GameStage.VALIDATOR);
    });

    // 🎯 Validation complete - move to Voting Phase
    socket.on("validationComplete", ({ validatorScores: scores }) => {
      console.log("🤖 Validation complete, moving to voting");
      setValidatorScores(scores);
      setStage(GameStage.COMMUNITY_VOTE);
    });

    // In the socket listeners section, update startVotingPhase:
    socket.on(
      "startVotingPhase",
      ({ questionIndex, totalQuestions, topic, argumentsData }) => {
        console.log(
          `🗳️ Starting voting for Q${questionIndex + 1}/${totalQuestions}`
        );

        // Update room info with voting index
        if (roomInfo) {
          setRoomInfo({
            ...roomInfo,
            votingQuestionIndex: questionIndex,
            totalQuestions: totalQuestions,
          });
        }

        setTopic(topic);
        setArgumentsData(argumentsData);

        // Reset validation scores for clarity
        setValidatorScores({});

        // Go to voting
        setStage(GameStage.COMMUNITY_VOTE);
      }
    );

    // 🎯 All votes received - calculate XP
    socket.on("allVotesReceived", ({ votes, voteTallies }) => {
      console.log("🗳️ All votes received, calculating XP");
      setVotes(votes);

      // Request XP calculation from server
      if (roomInfo) {
        socket.emit("calculateXP", { roomCode: roomInfo.id });
      }
    });

    // 🎯 XP distributed - move to Consensus
    socket.on("xpDistributed", ({ players, voteTallies, winners }) => {
      console.log("💎 XP distributed, moving to consensus");
      setPlayers(players);
      setFinalScores(players);
      setStage(GameStage.CONSENSUS);
    });

    // 🎯 Next question ready - reset and go back to Topic Reveal
    socket.on(
      "nextQuestion",
      ({ topic: newTopic, questionIndex, totalQuestions, phase }) => {
        console.log(
          `📋 Moving to question ${questionIndex + 1}/${totalQuestions}`
        );
        console.log(`🎯 New topic: ${newTopic}`);

        setTopic(newTopic);
        setStage(GameStage.TOPIC_REVEAL);
      }
    );

    socket.on(
      "showConsolidatedResults",
      ({ allVotes, allAnswers, players }) => {
        console.log("📊 Showing consolidated results for all questions");

        // Store all the data for the results screen
        setVotes(allVotes); // Now an array of vote objects
        setArgumentsData(allAnswers); // Now an array of answer objects
        setPlayers(players);
        setFinalScores(players);

        // Move to consolidated results phase
        setStage(GameStage.CONSENSUS);
      }
    );

    // 🎯 All questions complete - go to final leaderboard
    socket.on("allQuestionsComplete", ({ players }) => {
      console.log("🏁 All questions complete!");
      setPlayers(players);
      setFinalScores(players);
      setStage(GameStage.LEADERBOARD);
    });

    socket.on("leaderboardUpdated", (leaderboard) => {
      console.log("🏆 Leaderboard updated:", leaderboard);
      setFinalScores(leaderboard);
    });

    return () => {
      socket.off("roomsUpdated");
      socket.off("roomJoined");
      socket.off("playerJoined");
      socket.off("errorMessage");
      socket.off("roomEnded");
      socket.off("hostTransferred");
      socket.off("gameStartCountdown");
      socket.off("gameStarting");
      socket.off("allAnswersReceived");
      socket.off("validationComplete");
      socket.off("allVotesReceived");
      socket.off("xpDistributed");
      socket.off("nextQuestionReady");
      socket.off("allQuestionsComplete");
      socket.off("leaderboardUpdated");
    };
  }, [roomInfo, hostRoomInfo]);

  // Protection against wallet disconnect
  useEffect(() => {
    if (
      !isConnected &&
      stage !== GameStage.WELCOME &&
      stage !== GameStage.WALLET_CONNECT
    ) {
      toast.error("Wallet disconnected! Please reconnect to continue.");
      setStage(GameStage.WALLET_CONNECT);
    }
  }, [isConnected, stage]);

  const handleRoomJoin = (info) => {
    console.log("⚠️ handleRoomJoin called (deprecated):", info);
  };

  const handleHostRejoin = (roomCode) => {
    console.log("🔄 Host attempting to rejoin room:", roomCode);

    const roomExists = rooms.find((r) => r.id === roomCode);
    if (!roomExists) {
      toast.error("This room no longer exists.");
      localStorage.removeItem("hostRoomInfo");
      setHostRoomInfo(null);
      return;
    }

    socket.emit("joinRoom", {
      roomCode,
      mode: "join",
      isHostRejoining: true,
    });
  };

  // Handler for welcome screen
  const handleWelcomeComplete = () => {
    setStage(GameStage.WALLET_CONNECT);
  };

  // Handler for wallet connection
  const handleWalletConnected = (authData) => {
    console.log("Auth data:", authData);

    if (authData.type === "farcaster") {
      // Store Farcaster user for later use
      localStorage.setItem(
        "farcaster_user",
        JSON.stringify(authData.farcasterUser)
      );
      console.log(
        "🟣 Logged in with Farcaster:",
        authData.farcasterUser.username
      );
    } else if (authData.type === "wallet") {
      console.log("🦊 Logged in with wallet:", authData.account);
    }

    setStage(GameStage.ROOM_SELECT);
  };

  const handleWalletDisconnect = () => {
    setShowDisconnectPrompt(true);
  };

  const handleReconnect = () => {
    setShowDisconnectPrompt(false);
    setStage(GameStage.WALLET_CONNECT);
  };

  const handleGoToHomePage = () => {
    setShowDisconnectPrompt(false);
    if (roomInfo) {
      setStage(GameStage.WELCOME);
      window.location.reload();
    } else {
      setStage(GameStage.ROOM_SELECT);
    }
  };

  const handlePlayerSetupComplete = (playerData) => {
    console.log("✅ Player setup complete:", playerData);
    setCurrentPlayer(playerData);

    if (roomInfo) {
      socket.emit("playerSetupComplete", { roomId: roomInfo.id, playerData });
    }

    setStage(GameStage.DASHBOARD);
  };

  const handleStartFromDashboard = () => {
    setStage(GameStage.LOBBY);
  };

  const handleViewLeaderboard = () => {
    setStage(GameStage.LEADERBOARD);
  };

  const handleStartGame = () => {
    const updatedPlayers = simulateMode
      ? [currentPlayer, ...MOCK_PLAYERS.slice(1)]
      : players;
    setPlayers(updatedPlayers);
    setStage(GameStage.TOPIC_REVEAL);
  };

  const handlePlayAgain = () => {
    setTopic("");
    setArgumentsData([]);
    setValidatorScores({});
    setVotes({});
    setFinalScores([]);
    setStage(GameStage.DASHBOARD);
  };

  return (
    <div className="app-root">
      {/* <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1e1e1e",
            color: "#fff",
            borderRadius: "10px",
            fontSize: "14px",
          },
          success: { iconTheme: { primary: "#4ade80", secondary: "#fff" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      /> */}

      {stage !== GameStage.WELCOME && (
        <Header
          showWallet={stage !== GameStage.WALLET_CONNECT}
          onDisconnect={handleWalletDisconnect}
        />
      )}

      {/* Disconnect Prompt Modal */}
      {showDisconnectPrompt && (
        <div className="disconnect-modal-overlay">
          <div className="disconnect-modal">
            <h2>⚠️ Wallet Disconnected</h2>
            <p>Your wallet has been disconnected. What would you like to do?</p>

            <div className="disconnect-actions">
              <button className="btn reconnect-btn" onClick={handleReconnect}>
                🦊 Reconnect Wallet
              </button>
              <button
                className="btn dashboard-btn"
                onClick={() => window.location.reload()}
              >
                🏠 Go to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction notifications */}
      <TransactionNotification socket={socket} />

      {stage === GameStage.WELCOME && (
        <Welcome onGetStarted={handleWelcomeComplete} />
      )}

      {stage === GameStage.WALLET_CONNECT && (
        <WalletConnectScreen onConnected={handleWalletConnected} />
      )}

      {stage === GameStage.ROOM_SELECT && (
        <RoomSelect
          onJoinRoom={handleRoomJoin}
          simulateMode={simulateMode}
          setSimulateMode={setSimulateMode}
          rooms={rooms}
          socket={socket}
          hostRoomInfo={hostRoomInfo}
          onHostRejoin={handleHostRejoin}
        />
      )}

      {stage === GameStage.PLAYER_SETUP && (
        <PlayerSetup onComplete={handlePlayerSetupComplete} account={account} />
      )}

      {stage === GameStage.DASHBOARD && (
        <Dashboard
          currentPlayer={currentPlayer}
          onStartGame={handleStartFromDashboard}
          onViewLeaderboard={handleViewLeaderboard}
          rooms={rooms}
          socket={socket}
          onJoinRoom={handleRoomJoin}
          roomInfo={roomInfo}
        />
      )}

      {stage === GameStage.LOBBY && (
        <Lobby onStart={handleStartGame} currentPlayer={currentPlayer} />
      )}

      {stage === GameStage.TOPIC_REVEAL && (
        <TopicReveal
          topic={topic}
          onReveal={() => setStage(GameStage.ARGUMENT)}
        />
      )}

      {stage === GameStage.ARGUMENT && (
        <ArgumentPhase
          topic={topic}
          players={players}
          currentPlayer={currentPlayer}
          onSubmit={() => {}} // No-op, server handles transition
          socket={socket}
          roomInfo={roomInfo}
          contract={contract}
          account={account}
        />
      )}

      {stage === GameStage.VALIDATOR && (
        <ValidatorPhase
          argumentsData={argumentsData}
          onComplete={() => {}}
          currentPlayer={currentPlayer}
          socket={socket}
          roomInfo={roomInfo}
        />
      )}

      {stage === GameStage.COMMUNITY_VOTE && (
        <CommunityVote
          argumentsData={argumentsData}
          players={players}
          validatorScores={validatorScores}
          currentPlayer={currentPlayer}
          onComplete={() => {}}
          socket={socket}
          roomInfo={roomInfo}
          contract={contract}
          account={account}
        />
      )}

      {stage === GameStage.CONSENSUS && (
        <ConsolidatedResults
          allVotes={votes}
          allAnswers={argumentsData}
          players={players}
          onComplete={() => setStage(GameStage.LEADERBOARD)}
          socket={socket}
          roomInfo={roomInfo}
        />
      )}

      {stage === GameStage.LEADERBOARD && (
        <Leaderboard finalScores={finalScores} onPlayAgain={handlePlayAgain} />
      )}
    </div>
  );
}
