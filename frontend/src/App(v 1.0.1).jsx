import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { GameStage } from "./utils/constants";
import { MOCK_PLAYERS } from "./data";

import RoomSelect from "./components/room/RoomSelect";
import PlayerSetup from "./components/room/PlayerSetup";
import Dashboard from "./components/room/Dashboard";
import Lobby from "./components/room/Lobby";
import TopicReveal from "./components/game/TopicReveal";
import ArgumentPhase from "./components/game/ArgumentPhase";
import ValidatorPhase from "./components/game/ValidatorPhase";
import CommunityVote from "./components/game/CommunityVote";
import ConsensusPhase from "./components/game/ConsensusPhase";
import Leaderboard from "./components/game/Leaderboard";
import ConsolidatedResults from "./components/game/ConsolidatedResults";
import Welcome from "./components/layout/Welcome";

import { useWeb3 } from "./blockchain/hooks/useWeb3";
import { useContract } from "./blockchain/hooks/useContract";
import WalletConnect from "./components/blockchain/WalletConnect";


import "./styles/App.css";
import "./styles/SharedComponents.css";

const socket = io("http://localhost:4000", { transports: ["websocket"] });

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
      alert(message);
    });

    socket.on("roomEnded", ({ message }) => {
      console.log("🛑 Room ended:", message);
      alert(message);

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

    // 🎯 Game actually starts - move to Topic Reveal
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

    // 🎯 Validation complete - move to Community Vote
    socket.on("validationComplete", ({ validatorScores: scores }) => {
      console.log("🤖 Validation complete, moving to voting");
      setValidatorScores(scores);
      setStage(GameStage.COMMUNITY_VOTE);
    });

   // In the socket listeners section, update startVotingPhase:
    socket.on("startVotingPhase", ({ questionIndex, totalQuestions, topic, argumentsData }) => {
      console.log(`🗳️ Starting voting for Q${questionIndex + 1}/${totalQuestions}`);
      
      // Update room info with voting index
      if (roomInfo) {
        setRoomInfo({
          ...roomInfo,
          votingQuestionIndex: questionIndex,
          totalQuestions: totalQuestions
        });
      }
      
      setTopic(topic);
      setArgumentsData(argumentsData);
      
      // Reset validation scores for clarity
      setValidatorScores({});
      
      // Go to voting
      setStage(GameStage.COMMUNITY_VOTE);
    });

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
    socket.on("nextQuestion", ({ topic: newTopic, questionIndex, totalQuestions, phase }) => {
      console.log(`📋 Moving to question ${questionIndex + 1}/${totalQuestions}`);
      console.log(`🎯 New topic: ${newTopic}`);
      
      setTopic(newTopic);
      setStage(GameStage.TOPIC_REVEAL);
    });

    socket.on("showConsolidatedResults", ({ allVotes, allAnswers, players }) => {
      console.log("📊 Showing consolidated results for all questions");
      
      // Store all the data for the results screen
      setVotes(allVotes); // Now an array of vote objects
      setArgumentsData(allAnswers); // Now an array of answer objects
      setPlayers(players);
      setFinalScores(players);
      
      // Move to consolidated results phase
      setStage(GameStage.CONSENSUS);
    });

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

  const handleRoomJoin = (info) => {
    console.log("⚠️ handleRoomJoin called (deprecated):", info);
  };

  const handleHostRejoin = (roomCode) => {
    console.log("🔄 Host attempting to rejoin room:", roomCode);

    const roomExists = rooms.find((r) => r.id === roomCode);
    if (!roomExists) {
      alert("This room no longer exists.");
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

  // 🎯 FIX #1: Modified to accept topic from server instead of picking randomly
  const handleStartGame = (serverTopic) => {
    const updatedPlayers = simulateMode
      ? [currentPlayer, ...MOCK_PLAYERS.slice(1)]
      : players;
    setPlayers(updatedPlayers);

    // Use topic from server (already set via socket event)
    // setTopic is already called in the socket listener above

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
      {stage === GameStage.WELCOME && (
      <Welcome onGetStarted={() => setStage(GameStage.ROOM_SELECT)} />
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
        <PlayerSetup onComplete={handlePlayerSetupComplete} />
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
        />
      )}

      {stage === GameStage.VALIDATOR && (
        <ValidatorPhase
          argumentsData={argumentsData}
          onComplete={() => {}} // No-op, server handles transition
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
          onComplete={() => {}} // No-op, server handles transition
          socket={socket}
          roomInfo={roomInfo}
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
