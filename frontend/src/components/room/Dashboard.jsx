// src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
import "../../styles/components/room/Dashboard.css";
import { useWeb3 } from "../../blockchain/hooks/useWeb3";
import { useContract } from "../../blockchain/hooks/useContract";

// Blockchain Players Panel Component
function BlockchainPlayersPanel({
  contract,
  currentRoom,
  roomCreatedOnChain,
  blockchainPlayers,
  playersInRoom,
  fetchingPlayers,
}) {
  if (!contract || !roomCreatedOnChain) {
    return null;
  }

  // Match blockchain addresses with socket players
  const getPlayerName = (address) => {
    const player = playersInRoom.find(
      (p) =>
        p.walletAddress &&
        p.walletAddress.toLowerCase() === address.toLowerCase()
    );
    return player
      ? player.name
      : `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const socketPlayersWithWallets = playersInRoom.filter((p) => p.walletAddress);
  const blockchainPlayerCount = blockchainPlayers.length;
  const totalPlayersWithWallets = socketPlayersWithWallets.length;
  const allPlayersJoined =
    totalPlayersWithWallets > 0 &&
    blockchainPlayerCount === totalPlayersWithWallets;

  return (
    <div className="blockchain-players-panel">
      <div className="panel-header">
        <h4>⛓️ Blockchain Room Status</h4>
        {fetchingPlayers && <span className="fetching-indicator">🔄</span>}
      </div>

      <div className="players-count-summary">
        <div className="count-item">
          <span className="count-number">{blockchainPlayerCount}</span>
          <span className="count-label">On Blockchain</span>
        </div>
        <div className="count-divider">/</div>
        <div className="count-item">
          <span className="count-number">{totalPlayersWithWallets}</span>
          <span className="count-label">With Wallets</span>
        </div>
      </div>

      {allPlayersJoined && (
        <div className="all-joined-message">
          🎉 All players are on the blockchain! Ready to start!
        </div>
      )}

      {blockchainPlayerCount < totalPlayersWithWallets && (
        <div className="warning-message">
          ⚠️ {totalPlayersWithWallets - blockchainPlayerCount} player(s) haven't
          joined blockchain yet
        </div>
      )}

      <div className="blockchain-players-list">
        <h5>Players in Blockchain Room:</h5>
        {blockchainPlayers.length === 0 ? (
          <p className="empty-state">No players on blockchain yet</p>
        ) : (
          <ul>
            {blockchainPlayers.map((address, index) => (
              <li key={index} className="blockchain-player-item">
                <span className="player-check">✅</span>
                <span className="player-name">{getPlayerName(address)}</span>
                <span className="player-address">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPlayersWithWallets > blockchainPlayerCount && (
        <div className="pending-players">
          <h5>Waiting for:</h5>
          <ul>
            {socketPlayersWithWallets
              .filter(
                (p) =>
                  !blockchainPlayers.some(
                    (addr) =>
                      addr.toLowerCase() === p.walletAddress.toLowerCase()
                  )
              )
              .map((player, index) => (
                <li key={index} className="pending-player-item">
                  <span className="player-pending">⏳</span>
                  <span className="player-name">{player.name}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({
  currentPlayer,
  onStartGame,
  onViewLeaderboard,
  rooms,
  socket,
  onJoinRoom,
  roomInfo: roomInfoProp,
}) {
  const [currentRoom, setCurrentRoom] = useState(roomInfoProp || null);
  const [isHost, setIsHost] = useState(false);
  const [playersInRoom, setPlayersInRoom] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainStep, setBlockchainStep] = useState("");
  const [blockchainSteps, setBlockchainSteps] = useState([]);
  const [roomCreatedOnChain, setRoomCreatedOnChain] = useState(false);
  const [hostJoinedChain, setHostJoinedChain] = useState(false);
  const [checkingBlockchainStatus, setCheckingBlockchainStatus] =
    useState(false);

  const [blockchainPlayers, setBlockchainPlayers] = useState([]);
  const [fetchingPlayers, setFetchingPlayers] = useState(false);

  const { signer, account, isConnected } = useWeb3();
  const { contract, isReady } = useContract(signer);

  useEffect(() => {
    if (contract) {
      contract
        .weeklyTopic()
        .then((topic) => {
          console.log("📋 Current weekly topic:", topic);
        })
        .catch((err) => {
          console.error("Failed to get topic:", err);
        });
    }
  }, [contract]);

  useEffect(() => {
    // Listen for room updates
    socket.on("playerJoined", (updatedRoom) => {
      if (currentRoom && updatedRoom.id === currentRoom.id) {
        console.log("📥 Room update received:", updatedRoom);

        setCurrentRoom(updatedRoom);
        setPlayersInRoom(updatedRoom.players);

        // VERIFY host status matches server
        const serverSaysImHost = updatedRoom.hostId === socket.id;
        if (isHost !== serverSaysImHost) {
          console.log(
            `⚠️ Host status corrected: ${isHost} -> ${serverSaysImHost}`
          );
          setIsHost(serverSaysImHost);
        }
      }
    });

    // Listen for host transfer
    socket.on("hostTransferred", ({ newHostId, message }) => {
      if (newHostId === socket.id) {
        setIsHost(true);
        alert(message);
      }
    });

    // Listen for simulation enabled
    socket.on("simulationEnabled", ({ room }) => {
      if (currentRoom && room.id === currentRoom.id) {
        setCurrentRoom(room);
        setPlayersInRoom(room.players);
        if (isHost) {
          alert("Simulation mode enabled! Bot players have been added.");
        }
      }
    });

    // Listen for game start countdown
    socket.on("gameStartCountdown", ({ countdown: initialCountdown }) => {
      console.log("🎮 Game starting countdown:", initialCountdown);
      setIsStarting(true);
      setCountdown(initialCountdown);

      let currentCount = initialCountdown;
      const countdownInterval = setInterval(() => {
        currentCount--;
        setCountdown(currentCount);

        if (currentCount <= 0) {
          clearInterval(countdownInterval);
          setCountdown(null);
          setIsStarting(false);
          // Don't call onStartGame here - wait for server event
        }
      }, 1000);
    });

    // Listen for room ended by host
    socket.on("roomEnded", ({ message }) => {
      alert(message);
      setCurrentRoom(null);
      setIsHost(false);
      setPlayersInRoom([]);
      setCountdown(null);
      setIsStarting(false);
      // Optionally redirect to room select
      window.location.reload();
    });

    return () => {
      socket.off("playerJoined");
      socket.off("hostTransferred");
      socket.off("simulationEnabled");
      socket.off("gameStartCountdown");
      socket.off("roomEnded");
    };
  }, [currentRoom, socket, isHost, onStartGame]);

  // Verify host status periodically
  useEffect(() => {
    if (!socket || !currentRoom) return;

    // Verify immediately on mount
    socket.emit("verifyHostStatus", { roomCode: currentRoom.id });

    // Verify every 10 seconds
    const verifyInterval = setInterval(() => {
      socket.emit("verifyHostStatus", { roomCode: currentRoom.id });
    }, 10000);

    // Handle verification response
    const handleHostStatusVerified = ({
      isHost: serverIsHost,
      hostId,
      originalHostId,
    }) => {
      console.log(
        `🔍 Server says: isHost=${serverIsHost}, hostId=${hostId}, myId=${socket.id}`
      );

      // Update local state if it doesn't match server
      if (isHost !== serverIsHost) {
        console.log(
          `⚠️ Host status mismatch! Correcting: ${isHost} -> ${serverIsHost}`
        );
        setIsHost(serverIsHost);

        if (serverIsHost) {
          alert("👑 You are now the host!");
        }
      }

      // Update room info with correct host
      if (currentRoom && currentRoom.hostId !== hostId) {
        setCurrentRoom((prev) => ({
          ...prev,
          hostId: hostId,
          originalHostId: originalHostId,
        }));
      }
    };

    socket.on("hostStatusVerified", handleHostStatusVerified);

    return () => {
      clearInterval(verifyInterval);
      socket.off("hostStatusVerified", handleHostStatusVerified);
    };
  }, [socket, currentRoom, isHost]);

  // Send heartbeat if host
  useEffect(() => {
    if (!socket || !currentRoom || !isHost) return;

    // Send heartbeat every 7 seconds
    const heartbeatInterval = setInterval(() => {
      socket.emit("hostHeartbeat", { roomCode: currentRoom.id });
    }, 7000);

    return () => clearInterval(heartbeatInterval);
  }, [socket, currentRoom, isHost]);

  // Listen for host transfer
  useEffect(() => {
    if (!socket) return;

    const handleHostTransferred = ({
      newHostId,
      originalHostLeft,
      message,
    }) => {
      console.log("👑 Host transfer event received:", {
        newHostId,
        myId: socket.id,
      });

      if (newHostId === socket.id) {
        console.log("✅ I am now the host!");
        setIsHost(true);
        alert(message);
      } else if (isHost && newHostId !== socket.id) {
        console.log("⚠️ I am no longer the host");
        setIsHost(false);
      }

      // Update room info
      if (currentRoom) {
        setCurrentRoom((prev) => ({
          ...prev,
          hostId: newHostId,
        }));
      }
    };

    socket.on("hostTransferred", handleHostTransferred);

    return () => {
      socket.off("hostTransferred", handleHostTransferred);
    };
  }, [socket, isHost, currentRoom]);

  // Get room info from App.jsx (passed via rooms prop)
  useEffect(() => {
    // Check if user is in a room by looking at the rooms list
    const userRoom = rooms.find((room) =>
      room.players?.some((p) => p.id === socket.id)
    );

    if (userRoom) {
      setCurrentRoom(userRoom);
      setPlayersInRoom(userRoom.players || []);
      setIsHost(userRoom.hostId === socket.id);
    }
  }, [rooms, socket.id]);

  // Check blockchain room status
  useEffect(() => {
    const checkBlockchainStatus = async () => {
      if (!contract || !account || !currentRoom) return;

      setCheckingBlockchainStatus(true);
      try {
        // Check if room exists on blockchain
        const exists = await contract.roomExists(currentRoom.id);
        setRoomCreatedOnChain(exists);

        if (exists) {
          // Check if host is in the room
          const players = await contract.getRoomPlayers(currentRoom.id);
          const hostInRoom = players.some(
            (p) => p.toLowerCase() === account.toLowerCase()
          );
          setHostJoinedChain(hostInRoom);
        }
      } catch (err) {
        console.error("Failed to check blockchain status:", err);
      } finally {
        setCheckingBlockchainStatus(false);
      }
    };

    checkBlockchainStatus();
  }, [contract, account, currentRoom]);

  // Listen for blockchain room creation event
  useEffect(() => {
    if (!contract || !currentRoom) return;

    const handleRoomCreated = (roomCode, gameId) => {
      console.log(
        `🎉 Room created on blockchain: ${roomCode} (Game ID: ${gameId})`
      );
      if (roomCode === currentRoom.id) {
        setRoomCreatedOnChain(true);

        // Notify all players in the room via Socket.IO
        if (socket && isHost) {
          socket.emit("blockchainRoomCreated", { roomCode: currentRoom.id });
        }
      }
    };

    // Listen for GameCreated event
    contract.on("GameCreated", handleRoomCreated);

    return () => {
      contract.off("GameCreated", handleRoomCreated);
    };
  }, [contract, currentRoom, socket, isHost]);

  // Listen for blockchain room creation (for non-host players)
  useEffect(() => {
    if (isHost || !socket) return;

    const handleBlockchainRoomCreated = ({ roomCode }) => {
      if (currentRoom && currentRoom.id === roomCode) {
        console.log("🔔 Blockchain room created! Prompting to join...");
        setRoomCreatedOnChain(true);

        // Show prompt
        if (contract && account) {
          toast.info("⛓️ Blockchain room is ready! Join now...");
        }
      }
    };

    socket.on("blockchainRoomCreated", handleBlockchainRoomCreated);

    return () => {
      socket.off("blockchainRoomCreated", handleBlockchainRoomCreated);
    };
  }, [isHost, socket, currentRoom, contract, account]);

  // Fetch blockchain players count
  const fetchBlockchainPlayers = async () => {
    if (!contract || !currentRoom || !roomCreatedOnChain) {
      setBlockchainPlayers([]);
      return;
    }

    setFetchingPlayers(true);
    try {
      const players = await contract.getRoomPlayers(currentRoom.id);
      console.log("📊 Blockchain players:", players);
      setBlockchainPlayers(players);
    } catch (err) {
      console.error("Failed to fetch blockchain players:", err);
      setBlockchainPlayers([]);
    } finally {
      setFetchingPlayers(false);
    }
  };

  // Poll blockchain players every 5 seconds
  useEffect(() => {
    if (!roomCreatedOnChain || !contract || !currentRoom) {
      return;
    }

    // Initial fetch
    fetchBlockchainPlayers();

    // Set up polling
    const interval = setInterval(() => {
      fetchBlockchainPlayers();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [roomCreatedOnChain, contract, currentRoom]);

  const handleEnableSimulation = () => {
    if (!isHost) {
      alert("Only the host can enable simulation mode!");
      return;
    }

    if (
      window.confirm(
        "Enable simulation mode? This will add bot players to fill the room."
      )
    ) {
      socket.emit("enableSimulation", { roomCode: currentRoom.id });
    }
  };

  const handleEndRoom = () => {
    if (!isHost) {
      alert("Only the host can end the room!");
      return;
    }

    if (
      window.confirm(
        "Are you sure you want to end this room? All players will be kicked out."
      )
    ) {
      socket.emit("endRoom", { roomCode: currentRoom.id });
    }
  };

  // 1. CREATE AND JOIN BLOCKCHAIN ROOM (Combined for host)
  const handleSetupBlockchainRoom = async () => {
    if (!isHost) {
      alert("Only the host can set up the blockchain room!");
      return;
    }

    if (!contract || !account) {
      alert("⚠️ Blockchain not connected!");
      return;
    }

    setBlockchainLoading(true);
    setBlockchainSteps([]);

    try {
      // STEP 1: Check weekly topic
      setBlockchainStep("Checking weekly topic...");
      setBlockchainSteps([
        { text: "Checking weekly topic", status: "pending" },
      ]);

      const weeklyTopic = await contract.weeklyTopic();
      if (!weeklyTopic || weeklyTopic.length === 0) {
        setBlockchainLoading(false);
        alert("⚠️ Weekly topic not set on blockchain. Please contact admin.");
        return;
      }

      setBlockchainSteps([
        { text: "Checking weekly topic", status: "success" },
      ]);
      console.log("📋 Weekly topic:", weeklyTopic);

      // STEP 2: Check if room already exists
      setBlockchainStep("Checking room status...");
      setBlockchainSteps((prev) => [
        ...prev,
        { text: "Checking room status", status: "pending" },
      ]);

      const roomExists = await contract.roomExists(currentRoom.id);

      setBlockchainSteps((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].status = "success";
        return updated;
      });

      // STEP 3: Create room if it doesn't exist
      if (!roomExists) {
        setBlockchainStep("Creating room on blockchain...");
        setBlockchainSteps((prev) => [
          ...prev,
          { text: "Creating blockchain room", status: "pending" },
        ]);

        const createTx = await contract.createGameRoom(currentRoom.id);

        setBlockchainStep("Waiting for room creation confirmation...");
        const createReceipt = await createTx.wait();

        setBlockchainSteps((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].status = "success";
          updated[updated.length - 1].hash = createTx.hash;
          updated[updated.length - 1].block = createReceipt.blockNumber;
          return updated;
        });

        console.log("✅ Room created on blockchain!");
        setRoomCreatedOnChain(true);
      } else {
        console.log("✅ Room already exists on blockchain");
        setRoomCreatedOnChain(true);
        setBlockchainSteps((prev) => [
          ...prev,
          { text: "Room already exists", status: "success" },
        ]);
      }

      // STEP 4: Join room as host
      setBlockchainStep("Joining blockchain room...");
      setBlockchainSteps((prev) => [
        ...prev,
        { text: "Joining blockchain room", status: "pending" },
      ]);

      const players = await contract.getRoomPlayers(currentRoom.id);
      const alreadyInRoom = players.some(
        (p) => p.toLowerCase() === account.toLowerCase()
      );

      if (!alreadyInRoom) {
        const joinTx = await contract.joinGameRoom(currentRoom.id);

        setBlockchainStep("Waiting for join confirmation...");
        const joinReceipt = await joinTx.wait();

        setBlockchainSteps((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].status = "success";
          updated[updated.length - 1].hash = joinTx.hash;
          updated[updated.length - 1].block = joinReceipt.blockNumber;
          return updated;
        });

        console.log("✅ Joined blockchain room!");
      } else {
        console.log("✅ Already in blockchain room");
        setBlockchainSteps((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].status = "success";
          return updated;
        });
      }

      setHostJoinedChain(true);
      setBlockchainStep("Blockchain room ready!");

      await fetchBlockchainPlayers();

      // Notify other players via Socket.IO
      socket.emit("blockchainRoomCreated", { roomCode: currentRoom.id });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      setBlockchainLoading(false);
    } catch (err) {
      console.error("❌ Blockchain setup failed:", err);
      setBlockchainSteps((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].status = "error";
          updated[updated.length - 1].error = err.reason || err.message;
        }
        return updated;
      });
      setBlockchainLoading(false);
      alert(`Failed to setup blockchain room: ${err.reason || err.message}`);
    }
  };

  // 2. START GAME (Simplified - only starts game)
  const handleStartGame = async () => {
    if (!isHost) {
      alert("Only the host can start the game!");
      return;
    }

    const playerCount = playersInRoom.length;
    if (playerCount < 2) {
      alert("You need at least 2 players to start the game!");
      return;
    }

    // Handle simulation if needed
    if (playerCount < 4) {
      const proceed = window.confirm(
        `You only have ${playerCount} players. Do you want to enable simulation mode to add bots before starting?`
      );
      if (proceed) {
        socket.emit("enableSimulation", { roomCode: currentRoom.id });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Start game on blockchain if room is set up
    if (contract && account && roomCreatedOnChain && hostJoinedChain) {
      setBlockchainLoading(true);
      setBlockchainSteps([]);

      try {
        setBlockchainStep("Starting game on blockchain...");
        setBlockchainSteps([
          { text: "Starting blockchain game", status: "pending" },
        ]);

        const startTx = await contract.startGame(currentRoom.id);

        setBlockchainStep("Waiting for game start confirmation...");
        const startReceipt = await startTx.wait();

        setBlockchainSteps([
          {
            text: "Starting blockchain game",
            status: "success",
            hash: startTx.hash,
            block: startReceipt.blockNumber,
          },
        ]);

        console.log("✅ Game started on blockchain!");
        setBlockchainStep("Game started successfully!");

        await new Promise((resolve) => setTimeout(resolve, 1500));
        setBlockchainLoading(false);
      } catch (err) {
        console.error("❌ Blockchain start failed:", err);
        setBlockchainLoading(false);

        const proceed = window.confirm(
          `Blockchain error: ${
            err.reason || err.message
          }\n\nContinue with Socket.IO-only mode?`
        );
        if (!proceed) return;
      }
    }

    // Emit Socket.IO start event
    console.log("📡 Emitting Socket.IO startGame event...");
    socket.emit("startGame", { roomCode: currentRoom.id });
  };

  // 3. JOIN BLOCKCHAIN ROOM (For non-host players)
  const handleJoinBlockchainRoom = async () => {
    if (!contract || !account) {
      alert("⚠️ Blockchain not connected!");
      return;
    }

    if (!roomCreatedOnChain) {
      alert("⚠️ Room not created on blockchain yet! Wait for the host.");
      return;
    }

    setBlockchainLoading(true);
    setBlockchainSteps([]);

    try {
      // Check if already in room
      setBlockchainStep("Checking room membership...");
      setBlockchainSteps([
        { text: "Checking if you're in room", status: "pending" },
      ]);

      const players = await contract.getRoomPlayers(currentRoom.id);
      const alreadyInRoom = players.some(
        (p) => p.toLowerCase() === account.toLowerCase()
      );

      if (alreadyInRoom) {
        setBlockchainSteps([{ text: "Already in room", status: "success" }]);
        setBlockchainLoading(false);
        setHostJoinedChain(true);
        alert("✅ You're already in the blockchain room!");
        return;
      }

      setBlockchainSteps([
        { text: "Checking if you're in room", status: "success" },
      ]);

      // Join room
      setBlockchainStep("Joining blockchain room...");
      setBlockchainSteps((prev) => [
        ...prev,
        { text: "Joining blockchain room", status: "pending" },
      ]);

      const joinTx = await contract.joinGameRoom(currentRoom.id);

      setBlockchainStep("Waiting for join confirmation...");
      const joinReceipt = await joinTx.wait();

      setBlockchainSteps((prev) => {
        const updated = [...prev];
        updated[updated.length - 1].status = "success";
        updated[updated.length - 1].hash = joinTx.hash;
        updated[updated.length - 1].block = joinReceipt.blockNumber;
        return updated;
      });

      console.log("✅ Joined blockchain room!");
      setBlockchainStep("Successfully joined room!");
      setHostJoinedChain(true); // Use same state for any player

      await fetchBlockchainPlayers();

      await new Promise((resolve) => setTimeout(resolve, 2000));
      setBlockchainLoading(false);
    } catch (err) {
      console.error("❌ Join failed:", err);
      setBlockchainSteps((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].status = "error";
          updated[updated.length - 1].error = err.reason || err.message;
        }
        return updated;
      });
      setBlockchainLoading(false);
      alert(`Failed to join room: ${err.reason || err.message}`);
    }
  };

  const handleSetWeeklyTopic = async () => {
    if (!contract || !account) {
      alert("Contract not connected!");
      return;
    }

    try {
      console.log("📝 Setting weekly topic...");
      const tx = await contract.setWeeklyTopic("Is a hot dog a sandwich?");
      console.log("⏳ Waiting for transaction...");
      await tx.wait();
      console.log("✅ Weekly topic set!");
      alert("✅ Weekly topic set successfully!");
    } catch (err) {
      console.error("❌ Failed to set topic:", err);
      alert(`Failed to set topic: ${err.reason || err.message}`);
    }
  };

  // If user is in a room, show room dashboard
  if (currentRoom) {
    const playersNeeded = currentRoom.maxPlayers - playersInRoom.length;

    // Show countdown overlay if game is starting
    if (isStarting && countdown !== null) {
      return (
        <div className="dashboard-root">
          <div className="countdown-overlay">
            <div className="countdown-card">
              <h2>🎮 Game Starting!</h2>
              <div className="countdown-number">{countdown}</div>
              <p>Get ready...</p>
            </div>
          </div>
        </div>
      );
    }

    if (blockchainLoading) {
      return (
        <div className="dashboard-root">
          <div className="blockchain-progress-overlay">
            <div className="blockchain-progress-card">
              <h2>⛓️ Blockchain Setup</h2>
              <p className="blockchain-current-step">{blockchainStep}</p>

              <div className="blockchain-steps-list">
                {blockchainSteps.map((step, index) => (
                  <div key={index} className={`blockchain-step ${step.status}`}>
                    <div className="step-icon">
                      {step.status === "pending" && (
                        <div className="spinner-small"></div>
                      )}
                      {step.status === "success" && "✅"}
                      {step.status === "error" && "❌"}
                    </div>
                    <div className="step-content">
                      <div className="step-text">{step.text}</div>
                      {step.hash && (
                        <div className="step-hash">
                          Tx: {step.hash.slice(0, 10)}...{step.hash.slice(-8)}
                        </div>
                      )}
                      {step.block && (
                        <div className="step-block">Block: {step.block}</div>
                      )}
                      {step.error && (
                        <div className="step-error">{step.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <small className="blockchain-note">
                Please confirm transactions in MetaMask...
              </small>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-root">
        <header className="dashboard-header">
          <div className="player-box">
            <div className="avatar-large">{currentPlayer?.avatar || "🙂"}</div>
            <div>
              <div className="player-name">
                {currentPlayer?.name || "Guest"}
              </div>
              <div className="player-xp">XP: {currentPlayer?.xp || 0}</div>
            </div>
          </div>

          {isHost && (
            <div className="host-badge">
              👑 <span>You are the Host</span>
            </div>
          )}
        </header>

        <main className="dashboard-main room-view">
          <section className="room-info-panel">
            <div className="room-header">
              <h2>Room: {currentRoom.id}</h2>
              <div className="room-status">
                {playersNeeded > 0 ? (
                  <span className="waiting">
                    ⏳ Waiting for {playersNeeded} more player
                    {playersNeeded > 1 ? "s" : ""}...
                  </span>
                ) : (
                  <span className="ready">
                    ✅ Room is full! Ready to start.
                  </span>
                )}
              </div>
            </div>

            <div className="players-section">
              <h3>
                Players ({playersInRoom.length}/{currentRoom.maxPlayers})
              </h3>
              <ul className="players-list">
                {playersInRoom.map((player) => (
                  <li key={player.id} className="player-item">
                    <div className="player-avatar">
                      {player.isBot ? "🤖" : "👤"}
                    </div>
                    <div className="player-details">
                      <div className="player-name-row">
                        <span className="player-name">{player.name}</span>

                        {player.id === socket.id && (
                          <span className="you-tag">YOU</span>
                        )}
                        {player.id === currentRoom.hostId && (
                          <span className="host-tag">👑 Host</span>
                        )}
                        {player.isBot && (
                          <span className="bot-tag">🤖 Bot</span>
                        )}
                      </div>
                      <div className="player-id">
                        ID: {player.id.slice(0, 8)}...
                      </div>
                      <div className="player-xp">XP: {player.xp || 0}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {isHost && (
              <div className="host-controls">
                <h3>Host Controls</h3>

                {/* Blockchain Status Indicator */}
                {contract && account && (
                  <div className="blockchain-status-panel">
                    <div
                      className={`status-item ${
                        roomCreatedOnChain && hostJoinedChain
                          ? "complete"
                          : "pending"
                      }`}
                    >
                      {roomCreatedOnChain && hostJoinedChain
                        ? "✅ Blockchain Room Ready"
                        : "⏳ Blockchain Room Not Ready"}
                    </div>
                  </div>
                )}

                <BlockchainPlayersPanel
                  contract={contract}
                  currentRoom={currentRoom}
                  roomCreatedOnChain={roomCreatedOnChain}
                  blockchainPlayers={blockchainPlayers}
                  playersInRoom={playersInRoom}
                  fetchingPlayers={fetchingPlayers}
                />

                <div className="control-buttons">
                  {/* Single Blockchain Setup Button */}
                  {contract && account && !roomCreatedOnChain && (
                    <button
                      className="btn blockchain-setup-btn"
                      onClick={handleSetupBlockchainRoom}
                      disabled={blockchainLoading || checkingBlockchainStatus}
                    >
                      ⛓️ Create & Join Blockchain Room
                    </button>
                  )}

                  {/* Show status if already set up */}
                  {contract &&
                    account &&
                    roomCreatedOnChain &&
                    hostJoinedChain && (
                      <div className="blockchain-ready-message">
                        ✅ Blockchain room is ready!
                      </div>
                    )}

                  {/* Simulation Button */}
                  {playersInRoom.length < currentRoom.maxPlayers && (
                    <button
                      className="btn simulation-btn"
                      onClick={handleEnableSimulation}
                      disabled={currentRoom.simulation}
                    >
                      🤖{" "}
                      {currentRoom.simulation
                        ? "Simulation Active"
                        : "Enable Simulation Mode"}
                    </button>
                  )}

                  {/* Start Game Button - Only enabled when blockchain is ready */}
                  <button
                    className="btn start-btn"
                    onClick={handleStartGame}
                    disabled={
                      blockchainLoading ||
                      (contract &&
                        account &&
                        (!roomCreatedOnChain || !hostJoinedChain))
                    }
                    title={
                      contract &&
                      account &&
                      (!roomCreatedOnChain || !hostJoinedChain)
                        ? "Create & Join Blockchain Room first"
                        : ""
                    }
                  >
                    ▶️ Start Game
                  </button>

                  <button className="btn danger-btn" onClick={handleEndRoom}>
                    🛑 End Room
                  </button>
                </div>
              </div>
            )}

            {!isHost && (
              <div className="waiting-message">
                <p>⏳ Waiting for the host to start the game...</p>

                <BlockchainPlayersPanel
                  contract={contract}
                  currentRoom={currentRoom}
                  roomCreatedOnChain={roomCreatedOnChain}
                  blockchainPlayers={blockchainPlayers}
                  playersInRoom={playersInRoom}
                  fetchingPlayers={fetchingPlayers}
                />

                {contract && account && (
                  <div className="player-blockchain-panel">
                    <div
                      className={`status-item ${
                        roomCreatedOnChain ? "complete" : "pending"
                      }`}
                    >
                      {roomCreatedOnChain ? "✅" : "⏳"} Room on Blockchain
                    </div>
                    <div
                      className={`status-item ${
                        hostJoinedChain ? "complete" : "pending"
                      }`}
                    >
                      {hostJoinedChain ? "✅" : "⏳"} Joined Blockchain Room
                    </div>

                    {roomCreatedOnChain && !hostJoinedChain && (
                      <button
                        className="btn blockchain-btn"
                        onClick={handleJoinBlockchainRoom}
                        disabled={blockchainLoading}
                        style={{ marginTop: "15px" }}
                      >
                        🚪 Join Blockchain Room
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="room-actions-panel">
            <button className="btn secondary-btn" onClick={onViewLeaderboard}>
              🏆 View Leaderboard
            </button>
          </aside>
        </main>
      </div>
    );
  }

  // If user is NOT in a room, show default dashboard (shouldn't normally happen)
  return (
    <div className="dashboard-root">
      <header className="dashboard-header">
        <div className="player-box">
          <div className="avatar-large">{currentPlayer?.avatar || "🙂"}</div>
          <div>
            <div className="player-name">{currentPlayer?.name || "Guest"}</div>
            <div className="player-xp">XP: {currentPlayer?.xp || 0}</div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="empty-state">
          <h2>No Room Found</h2>
          <p>It looks like you're not in a room. This shouldn't happen.</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Return to Home
          </button>
        </div>
      </main>
    </div>
  );
}
