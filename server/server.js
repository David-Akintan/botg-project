import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { ethers } from "ethers";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://botg-project.vercel.app/", // frontend deployment url
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["polling", "websocket"],
  allowEIO3: true,
});

// --- Game Topics/Questions Pool ---
const GAME_TOPICS = [
  "What is a blockchain?",
  "What is a custodian wallet?",
  "How do you differentiate a token and a coin?",
  "Explain the concept of Liquidity Pools",
];

const TOTAL_QUESTIONS = 5;

// --- In-memory game state ---
let rooms = {}; // { roomCode: { id, players: [], hostId, isStarted, simulation, maxPlayers, topic, answers, votes, currentPhase } }
let socketToWallet = {};

// Game phases
const GamePhase = {
  LOBBY: "lobby",
  TOPIC_REVEAL: "topic_reveal",
  ARGUMENT: "argument",
  VALIDATOR: "validator",
  COMMUNITY_VOTE: "community_vote",
  RESULTS: "results",
  LEADERBOARD: "leaderboard",
};

// Blockchain setup
const BLOCKCHAIN_ENABLED = process.env.BLOCKCHAIN_ENABLED === "true";
let provider;
let contract;
let ownerWallet;

if (BLOCKCHAIN_ENABLED) {
  console.log("🔗 Connecting to blockchain...");

  provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  // Owner wallet (for setting validator scores)
  ownerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const ConsensusClashABI = [
    "function registerPlayer(string memory _name, string memory _avatar) external",
    "function createGameRoom(string memory _roomCode) external returns (uint256)",
    "function joinGameRoom(string memory _roomCode) external",
    "function startGame(string memory _roomCode) external",
    "function submitArgument(string memory _roomCode, string memory _argument) external",
    "function castVote(string memory _roomCode, address _votedFor) external",
    "function setValidatorScores(string memory _roomCode, address _player, uint8 _creativity, uint8 _logic, uint8 _persuasiveness) external",
    "function calculateFinalScores(string memory _roomCode) external",
    "function getGameState(string memory _roomCode) view returns (uint256, uint8, string, uint256, uint256, uint256, bool)",
    "function getRoomPlayers(string memory _roomCode) view returns (address[])",
    "function getFinalRankings(string memory _roomCode) view returns (tuple(address,string,uint16,uint16,uint16,uint256)[])",
    "function registeredPlayers(address) view returns (string,string,uint256,uint256,uint256,bool)",
    "function roomExists(string memory _roomCode) view returns (bool)",
    "event ArgumentSubmitted(string indexed roomCode, address indexed player)",
    "event VoteCast(string indexed roomCode, address indexed voter, address indexed votedFor)",
    "event GameCompleted(string indexed roomCode, address winner)",
  ];

  contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    ConsensusClashABI,
    ownerWallet
  );

  // Listen to blockchain events
  contract.on("ArgumentSubmitted", (player, gameId) => {
    console.log(`🔗 Blockchain: Argument from ${player}`);
  });

  contract.on("VoteCast", (voter, votedFor) => {
    console.log(`🔗 Blockchain: Vote from ${voter} → ${votedFor}`);
  });

  contract.on("GameCompleted", (gameId, winner) => {
    console.log(`🔗 Blockchain: Game ${gameId} won by ${winner}`);
  });

  console.log("✅ Blockchain connected");
}

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Send initial room list to new connection
  socket.emit("roomsUpdated", getRoomSummaries());

  //Heartbeat to verify if host is still active
  socket.on("hostHeartbeat", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (room && room.hostId === socket.id) {
      room.lastHostHeartbeat = Date.now();
      // console.log(`💓 Host heartbeat for room ${roomCode}`);
    }
  });

  // Verify host status
  socket.on("verifyHostStatus", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("hostStatusVerified", { isHost: false, hostId: null });
      return;
    }

    const isHost = room.hostId === socket.id;
    const isOriginalHost = room.originalHostId === socket.id;

    socket.emit("hostStatusVerified", {
      isHost,
      isOriginalHost,
      hostId: room.hostId,
      originalHostId: room.originalHostId,
    });

    console.log(
      `🔍 Host status verified for ${socket.id} in ${roomCode}: isHost=${isHost}`
    );
  });

  // Handle wallet registration
  socket.on("registerWallet", ({ walletAddress }) => {
    console.log(
      `🔗 Registered wallet ${walletAddress} for socket ${socket.id}`
    );
    socketToWallet[socket.id] = walletAddress;
  });

  // NEW: Handle transaction pending
  socket.on("txPending", ({ roomCode, action }) => {
    console.log(`⏳ [${roomCode}] Transaction pending: ${action}`);
    io.to(roomCode).emit("txPending", { action, player: socket.id });
  });

  // NEW: Handle transaction confirmed
  socket.on("txConfirmed", ({ roomCode, action, txHash }) => {
    console.log(
      `✅ [${roomCode}] Transaction confirmed: ${action} - ${txHash}`
    );
    io.to(roomCode).emit("txConfirmed", { action, txHash });
  });

  // NEW: Handle transaction failed
  socket.on("txFailed", ({ roomCode, action, error }) => {
    console.log(`❌ [${roomCode}] Transaction failed: ${action} - ${error}`);
    io.to(roomCode).emit("txFailed", { action, error });
  });

  // --- Join or Create Room (unified handler) ---
  socket.on("joinRoom", ({ roomCode, mode, isHostRejoining }) => {
    console.log(
      `📥 joinRoom event: roomCode=${roomCode}, mode=${mode}, isHostRejoining=${isHostRejoining}`
    );

    // CREATE MODE: Create a new room if it doesn't exist
    if (mode === "create") {
      if (!rooms[roomCode]) {
        rooms[roomCode] = {
          id: roomCode,
          players: [],
          hostId: socket.id,
          originalHostId: socket.id,
          isStarted: false,
          simulation: false,
          maxPlayers: 4,
          topic: null, // Will be set when game starts
          answers: {}, // { playerId: answerText }
          votes: {}, // { voterId: votedPlayerId }
        };
        console.log(`🏠 Room ${roomCode} created with host ${socket.id}`);
      } else {
        console.log(`⚠️ Room ${roomCode} already exists, joining instead`);
      }
    }

    // JOIN MODE: Check if room exists
    if (mode === "join") {
      const room = rooms[roomCode];
      if (!room) {
        console.log(`❌ Room ${roomCode} not found`);
        socket.emit("errorMessage", "❌ Room not found!");
        return;
      }

      // SPECIAL CASE: Host rejoining after disconnect/refresh
      if (isHostRejoining) {
        const isStillHost = room.hostId === room.originalHostId;

        if (isStillHost) {
          console.log(`🔄 Original host rejoining room ${roomCode}`);

          const existingPlayer = room.players.find((p) => p.id === socket.id);
          if (!existingPlayer) {
            const player = {
              id: socket.id,
              name: `Player_${socket.id.slice(0, 4)}`,
              xp: 0,
            };
            room.players.push(player);
          }

          room.hostId = socket.id;
          room.originalHostId = socket.id;

          socket.join(roomCode);
          socket.emit("roomJoined", { room, isHost: true });
          io.to(roomCode).emit("playerJoined", room);
          io.emit("roomsUpdated", getRoomSummaries());
          return;
        } else {
          console.log(
            `⚠️ Host role transferred, ${socket.id} joining as regular player`
          );
          socket.emit(
            "errorMessage",
            "⚠️ Host role was transferred. Joining as a regular player."
          );
        }
      }

      // Check if room is full
      if (room.players.length >= room.maxPlayers) {
        console.log(`❌ Room ${roomCode} is full`);
        socket.emit("errorMessage", "❌ Room is full!");
        return;
      }
    }

    const room = rooms[roomCode];

    // Check if player already in room
    const existingPlayerIndex = room.players.findIndex(
      (p) => p.id === socket.id
    );
    if (existingPlayerIndex !== -1) {
      console.log(`👤 Player ${socket.id} already in room ${roomCode}`);
      socket.join(roomCode);
      const isHost = room.hostId === socket.id;
      socket.emit("roomJoined", { room, isHost });
      return;
    }

    // ADD: Check if player with same wallet address exists (duplicate prevention)
    const walletAddress = socketToWallet[socket.id];
    if (walletAddress) {
      const duplicatePlayer = room.players.find(
        (p) => socketToWallet[p.id] === walletAddress && p.id !== socket.id
      );

      if (duplicatePlayer) {
        console.log(
          `⚠️ Player with wallet ${walletAddress} already in room. Removing old entry.`
        );
        const dupIndex = room.players.findIndex(
          (p) => p.id === duplicatePlayer.id
        );
        room.players.splice(dupIndex, 1);
      }
    }

    // Add new player to room
    const player = {
      id: socket.id,
      name: `Player_${socket.id.slice(0, 4)}`,
      xp: 0,
    };

    room.players.push(player);
    socket.join(roomCode);

    const isHost = room.hostId === socket.id;
    console.log(
      `👤 ${player.name} joined ${roomCode} (${room.players.length}/${
        room.maxPlayers
      } players)${isHost ? " [HOST]" : ""}`
    );

    socket.emit("roomJoined", { room, isHost });
    io.to(roomCode).emit("playerJoined", room);
    io.emit("roomsUpdated", getRoomSummaries());
  });

  // --- Host: Enable Simulation Mode ---
  socket.on("enableSimulation", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("errorMessage", "❌ Room not found!");
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit(
        "errorMessage",
        "❌ Only the host can enable simulation mode!"
      );
      return;
    }

    console.log(`🤖 Simulation mode enabled for room ${roomCode}`);
    room.simulation = true;

    const botsNeeded = room.maxPlayers - room.players.length;
    const botNames = ["Bot_Alpha", "Bot_Beta", "Bot_Gamma", "Bot_Delta"];

    for (let i = 0; i < botsNeeded; i++) {
      const bot = {
        id: `bot_${Date.now()}_${i}`,
        name: botNames[i] || `Bot_${i}`,
        xp: 0,
        isBot: true,
      };
      room.players.push(bot);
    }

    console.log(`🤖 Added ${botsNeeded} bots to room ${roomCode}`);

    io.to(roomCode).emit("playerJoined", room);
    io.to(roomCode).emit("simulationEnabled", { room });
    io.emit("roomsUpdated", getRoomSummaries());
  });

  // Notify players when blockchain room is created
  socket.on("blockchainRoomCreated", ({ roomCode }) => {
    console.log(`📢 Broadcasting blockchain room creation for ${roomCode}`);
    io.to(roomCode).emit("blockchainRoomCreated", { roomCode });
  });

  // --- Host: Start Game ---
  socket.on("startGame", async ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("errorMessage", "❌ Room not found!");
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit("errorMessage", "❌ Only the host can start the game!");
      return;
    }

    console.log(`🚀 Host starting game in room ${roomCode}`);

    if (BLOCKCHAIN_ENABLED && contract) {
      try {
        console.log("⛓️ Starting game on blockchain...");
        const tx = await contract.startGame(roomCode);
        await tx.wait();
        console.log("✅ Game started on blockchain");
      } catch (err) {
        console.error("❌ Failed to start game on blockchain:", err);
      }
    }

    room.isStarted = true;
    room.currentQuestionIndex = 0;
    room.totalQuestions = TOTAL_QUESTIONS;
    room.currentPhase = "answering";
    room.votingQuestionIndex = 0;

    // Generate ALL 5 UNIQUE topics upfront
    room.topics = [];
    const availableTopics = [...GAME_TOPICS]; // Create a copy

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      if (availableTopics.length === 0) {
        // If we run out, refill the pool
        availableTopics.push(...GAME_TOPICS);
      }

      const randomIndex = Math.floor(Math.random() * availableTopics.length);
      const selectedTopic = availableTopics[randomIndex];
      room.topics.push(selectedTopic);

      // Remove the selected topic to avoid duplicates
      availableTopics.splice(randomIndex, 1);
    }

    // Store answers for each question separately
    room.allAnswers = [];
    room.allVotes = [];
    room.currentAnswers = {};
    room.currentVotes = {};

    console.log(
      `🎲 Generated ${TOTAL_QUESTIONS} unique topics for ${roomCode}:`,
      room.topics
    );

    // Broadcast countdown to all players
    io.to(roomCode).emit("gameStartCountdown", {
      roomCode,
      countdown: 5,
    });

    // After countdown, start game with first topic
    setTimeout(() => {
      console.log(
        `🎮 Game starting NOW for room ${roomCode} - Question 1/${TOTAL_QUESTIONS}`
      );
      io.to(roomCode).emit("gameStarting", {
        topic: room.topics[0],
        questionIndex: 0,
        totalQuestions: TOTAL_QUESTIONS,
        phase: "answering",
      });
    }, 5000);

    io.emit("roomsUpdated", getRoomSummaries());
  });

  // --- Progress to Next Question ---
  socket.on("nextQuestion", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.currentQuestionIndex = (room.currentQuestionIndex || 0) + 1;

    if (room.currentQuestionIndex < 5) {
      // Reset for next question
      room.answers = {};
      room.votes = {};

      console.log(
        `➡️ Moving to question ${
          room.currentQuestionIndex + 1
        } in room ${roomCode}`
      );

      io.to(roomCode).emit("nextQuestionReady", {
        questionIndex: room.currentQuestionIndex,
        totalQuestions: 5,
      });
    } else {
      // All questions done, go to final leaderboard
      console.log(`🏁 All questions complete in room ${roomCode}`);
      io.to(roomCode).emit("allQuestionsComplete", {
        players: room.players,
      });
    }
  });

  // --- Submit Answer ---
  socket.on("submitAnswer", ({ roomCode, answer }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("errorMessage", "❌ Room not found!");
      return;
    }

    // Store the player's answer for current question
    room.currentAnswers[socket.id] = answer;
    console.log(
      `📝 Answer submitted by ${socket.id} for Q${
        room.currentQuestionIndex + 1
      } in room ${roomCode}`
    );

    // Notify all players about the submission count
    const submissionCount = Object.keys(room.currentAnswers).length;
    const totalPlayers = room.players.filter((p) => !p.isBot).length;

    io.to(roomCode).emit("answerSubmitted", {
      submissionCount,
      totalPlayers,
      questionIndex: room.currentQuestionIndex,
    });

    // If all real players have submitted
    if (submissionCount === totalPlayers) {
      console.log(
        `✅ All players submitted answers for Q${
          room.currentQuestionIndex + 1
        } in room ${roomCode}`
      );

      // Generate bot answers
      const bots = room.players.filter((p) => p.isBot);
      bots.forEach((bot) => {
        room.currentAnswers[bot.id] = `Mock argument from ${bot.name} about ${
          room.topics[room.currentQuestionIndex]
        }. This is a sample argument.`;
      });

      // Save answers for this question
      room.allAnswers.push({
        questionIndex: room.currentQuestionIndex,
        topic: room.topics[room.currentQuestionIndex],
        answers: { ...room.currentAnswers },
      });

      // Check if this was the last question
      if (room.currentQuestionIndex < room.totalQuestions - 1) {
        // Move to next question
        room.currentQuestionIndex++;
        room.currentAnswers = {}; // Reset for next question

        console.log(
          `➡️ Moving to Q${room.currentQuestionIndex + 1} in room ${roomCode}`
        );

        io.to(roomCode).emit("nextQuestion", {
          topic: room.topics[room.currentQuestionIndex],
          questionIndex: room.currentQuestionIndex,
          totalQuestions: room.totalQuestions,
          phase: "answering",
        });
      } else {
        // All questions answered, start voting phase
        console.log(
          `✅ All questions answered! Starting voting phase for room ${roomCode}`
        );
        room.currentPhase = "voting";
        room.votingQuestionIndex = 0;

        // Send first question's answers for voting
        const firstQuestionData = room.allAnswers[0];
        const argumentsData = room.players.map((player) => ({
          player: {
            ...player,
            walletAddress: socketToWallet[player.id] || null, // ADD THIS
          },
          text: firstQuestionData.answers[player.id] || "No response provided",
        }));

        io.to(roomCode).emit("startVotingPhase", {
          questionIndex: 0,
          totalQuestions: room.totalQuestions,
          topic: firstQuestionData.topic,
          argumentsData: argumentsData,
        });
      }
    }
  });

  // --- Request to proceed with answers (for time-out scenario) ---
  socket.on("requestAllAnswers", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    console.log(
      `⏰ Time's up for Q${
        room.currentQuestionIndex + 1
      }! Processing answers for room ${roomCode}`
    );

    // Generate bot answers if any
    const bots = room.players.filter((p) => p.isBot);
    bots.forEach((bot) => {
      if (!room.currentAnswers[bot.id]) {
        room.currentAnswers[bot.id] = `Mock argument from ${bot.name} about ${
          room.topics[room.currentQuestionIndex]
        }.`;
      }
    });

    // Fill in missing answers for players who didn't submit
    room.players.forEach((player) => {
      if (!room.currentAnswers[player.id] && !player.isBot) {
        room.currentAnswers[player.id] =
          "No response provided (auto-submitted)";
      }
    });

    // Save answers for this question
    room.allAnswers.push({
      questionIndex: room.currentQuestionIndex,
      topic: room.topics[room.currentQuestionIndex],
      answers: { ...room.currentAnswers },
    });

    // Check if this was the last question
    if (room.currentQuestionIndex < room.totalQuestions - 1) {
      // Move to next question
      room.currentQuestionIndex++;
      room.currentAnswers = {}; // Reset for next question

      console.log(
        `➡️ Moving to Q${room.currentQuestionIndex + 1} in room ${roomCode}`
      );

      io.to(roomCode).emit("nextQuestion", {
        topic: room.topics[room.currentQuestionIndex],
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.totalQuestions,
        phase: "answering",
      });
    } else {
      // All questions answered, start voting phase
      console.log(
        `✅ All questions answered! Starting voting phase for room ${roomCode}`
      );
      room.currentPhase = "voting";
      room.votingQuestionIndex = 0;

      // Send first question's answers for voting
      const firstQuestionData = room.allAnswers[0];
      const argumentsData = room.players.map((player) => ({
        player: {
          ...player,
          walletAddress: socketToWallet[player.id] || null, // ADD THIS
        },
        text: firstQuestionData.answers[player.id] || "No response provided",
      }));

      io.to(roomCode).emit("startVotingPhase", {
        questionIndex: 0,
        totalQuestions: room.totalQuestions,
        topic: firstQuestionData.topic,
        argumentsData: argumentsData,
      });
    }
  });

  // --- Submit Vote ---
  socket.on("submitVote", ({ roomCode, votedForPlayerId }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("errorMessage", "❌ Room not found!");
      return;
    }

    if (votedForPlayerId === socket.id) {
      socket.emit("errorMessage", "❌ You cannot vote for yourself!");
      return;
    }

    // Store the vote for current voting question
    room.currentVotes[socket.id] = votedForPlayerId;
    console.log(
      `🗳️ Vote submitted by ${socket.id} for ${votedForPlayerId} on Q${
        room.votingQuestionIndex + 1
      }`
    );

    const voteCount = Object.keys(room.currentVotes).length;
    const totalPlayers = room.players.filter((p) => !p.isBot).length;

    io.to(roomCode).emit("voteSubmitted", {
      voteCount,
      totalPlayers,
      questionIndex: room.votingQuestionIndex,
    });

    // If all real players have voted
    if (voteCount === totalPlayers) {
      console.log(
        `✅ All players voted on Q${
          room.votingQuestionIndex + 1
        } in room ${roomCode}`
      );

      // Generate bot votes
      const bots = room.players.filter((p) => p.isBot);
      bots.forEach((bot) => {
        const eligiblePlayers = room.players.filter((p) => p.id !== bot.id);
        const randomPlayer =
          eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        room.currentVotes[bot.id] = randomPlayer.id;
      });

      // Calculate vote tallies (but DON'T distribute XP yet)
      const voteTallies = {};
      room.players.forEach((player) => {
        voteTallies[player.id] = 0;
      });

      Object.values(room.currentVotes).forEach((votedPlayerId) => {
        if (voteTallies[votedPlayerId] !== undefined) {
          voteTallies[votedPlayerId]++;
        }
      });

      // Save votes for this question (DON'T show results yet)
      room.allVotes.push({
        questionIndex: room.votingQuestionIndex,
        votes: { ...room.currentVotes },
        voteTallies: { ...voteTallies },
      });

      console.log(
        `📊 Saved votes for Q${room.votingQuestionIndex + 1}:`,
        room.allVotes[room.allVotes.length - 1]
      );

      // Check if more questions to vote on
      if (room.votingQuestionIndex < room.totalQuestions - 1) {
        // Move to next voting question immediately (no results shown)
        room.votingQuestionIndex++;
        room.currentVotes = {};

        console.log(
          `➡️ Moving to vote on Q${room.votingQuestionIndex + 1}/${
            room.totalQuestions
          }`
        );

        const nextQuestionData = room.allAnswers[room.votingQuestionIndex];
        if (!nextQuestionData) {
          console.error(
            `❌ ERROR: No answer data found for Q${
              room.votingQuestionIndex + 1
            }`
          );
          return;
        }

        const argumentsData = room.players.map((player) => ({
          player: {
            ...player,
            walletAddress: socketToWallet[player.id] || null, // ADD THIS
          },
          text: nextQuestionData.answers[player.id] || "No response provided",
        }));

        console.log(`➡️ Moving to vote on Q${room.votingQuestionIndex + 1}`);

        io.to(roomCode).emit("startVotingPhase", {
          questionIndex: room.votingQuestionIndex,
          totalQuestions: room.totalQuestions,
          topic: nextQuestionData.topic,
          argumentsData: argumentsData.map((arg) => ({
            ...arg,
            topic: nextQuestionData.topic,
          })),
        });
      } else {
        // All voting done, NOW calculate XP and show consolidated results
        console.log(
          `🏁 All voting complete for room ${roomCode}. Calculating final XP...`
        );

        // Calculate XP for ALL questions
        room.allVotes.forEach((voteData) => {
          const voteTallies = voteData.voteTallies;
          let maxVotes = Math.max(...Object.values(voteTallies));
          let winners = Object.keys(voteTallies).filter(
            (id) => voteTallies[id] === maxVotes && maxVotes > 0
          );

          room.players.forEach((player) => {
            const votes = voteTallies[player.id] || 0;
            let xpGained = votes * 10;

            if (winners.includes(player.id)) {
              xpGained += 100;
            }

            player.xp = (player.xp || 0) + xpGained;
          });
        });

        // Broadcast consolidated results
        io.to(roomCode).emit("showConsolidatedResults", {
          allVotes: room.allVotes,
          allAnswers: room.allAnswers,
          players: room.players,
        });
      }
    }
  });

  socket.on("requestAllVotes", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    console.log(
      `⏰ Voting time's up for Q${
        room.votingQuestionIndex + 1
      }! Processing votes for room ${roomCode}`
    );

    // Generate bot votes if any
    const bots = room.players.filter((p) => p.isBot);
    bots.forEach((bot) => {
      if (!room.currentVotes[bot.id]) {
        const eligiblePlayers = room.players.filter((p) => p.id !== bot.id);
        const randomPlayer =
          eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
        room.currentVotes[bot.id] = randomPlayer.id;
      }
    });

    // Calculate vote tallies (but DON'T distribute XP yet)
    const voteTallies = {};
    room.players.forEach((player) => {
      voteTallies[player.id] = 0;
    });

    Object.values(room.currentVotes).forEach((votedPlayerId) => {
      if (voteTallies[votedPlayerId] !== undefined) {
        voteTallies[votedPlayerId]++;
      }
    });

    // Save votes for this question
    room.allVotes.push({
      questionIndex: room.votingQuestionIndex,
      votes: { ...room.currentVotes },
      voteTallies: { ...voteTallies },
    });

    // Check if more questions to vote on
    if (room.votingQuestionIndex < room.totalQuestions - 1) {
      // Move to next voting question immediately
      room.votingQuestionIndex++;
      room.currentVotes = {};

      const nextQuestionData = room.allAnswers[room.votingQuestionIndex];
      const argumentsData = room.players.map((player) => ({
        player: player,
        text: nextQuestionData.answers[player.id] || "No response provided",
      }));

      console.log(`➡️ Moving to vote on Q${room.votingQuestionIndex + 1}`);

      io.to(roomCode).emit("startVotingPhase", {
        questionIndex: room.votingQuestionIndex,
        totalQuestions: room.totalQuestions,
        topic: nextQuestionData.topic,
        argumentsData: argumentsData,
      });
    } else {
      // All voting done, NOW calculate XP and show consolidated results
      console.log(
        `🏁 All voting complete for room ${roomCode}. Calculating final XP...`
      );

      // Calculate XP for ALL questions
      room.allVotes.forEach((voteData) => {
        const voteTallies = voteData.voteTallies;
        let maxVotes = Math.max(...Object.values(voteTallies));
        let winners = Object.keys(voteTallies).filter(
          (id) => voteTallies[id] === maxVotes && maxVotes > 0
        );

        room.players.forEach((player) => {
          const votes = voteTallies[player.id] || 0;
          let xpGained = votes * 10;

          if (winners.includes(player.id)) {
            xpGained += 100;
          }

          player.xp = (player.xp || 0) + xpGained;
        });
      });

      // Broadcast consolidated results
      io.to(roomCode).emit("showConsolidatedResults", {
        allVotes: room.allVotes,
        allAnswers: room.allAnswers,
        players: room.players,
      });
    }
  });

  // ADD: Set validator scores when all answers submitted
  socket.on("allAnswersReceived", async ({ argumentsData }) => {
    const room = rooms[roomCode];

    // ... existing Socket.IO broadcast

    // 🔥 SET VALIDATOR SCORES ON BLOCKCHAIN
    if (BLOCKCHAIN_ENABLED && contract) {
      try {
        console.log("🤖 Setting validator scores on blockchain...");

        for (const arg of argumentsData) {
          // Generate mock scores (in production, use actual AI/oracle)
          const creativity = Math.floor(Math.random() * 30) + 70;
          const logic = Math.floor(Math.random() * 30) + 70;
          const persuasiveness = Math.floor(Math.random() * 30) + 70;

          // Get player wallet address (you need to store this mapping)
          const playerAddress = arg.player.walletAddress || ethers.ZeroAddress;

          if (playerAddress !== ethers.ZeroAddress) {
            const tx = await contract.setValidatorScores(
              playerAddress,
              creativity,
              logic,
              persuasiveness
            );
            await tx.wait();
            console.log(`✅ Scores set for ${playerAddress}`);
          }
        }
      } catch (err) {
        console.error("❌ Failed to set validator scores:", err);
      }
    }
  });

  // ADD: Calculate final scores on blockchain when voting done
  socket.on("allVotesReceived", async ({ roomCode }) => {
    const room = rooms[roomCode];

    // ... existing XP calculation

    // 🔥 CALCULATE SCORES ON BLOCKCHAIN
    if (BLOCKCHAIN_ENABLED && contract) {
      try {
        console.log("📊 Calculating final scores on blockchain...");
        const tx = await contract.calculateFinalScores();
        await tx.wait();
        console.log("✅ Scores calculated on blockchain");

        // Get rankings from blockchain
        const rankings = await contract.getFinalRankings();
        console.log("🏆 Blockchain rankings:", rankings);
      } catch (err) {
        console.error("❌ Failed to calculate scores:", err);
      }
    }
  });

  // --- Handle Validator Scores Submission ---
  socket.on("submitValidatorScores", ({ roomCode, scores }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Store validator scores (optional, for tracking)
    room.validatorScores = scores;

    console.log(`🤖 Validator scores received for room ${roomCode}`);

    // Broadcast to all players that validation is complete
    io.to(roomCode).emit("validationComplete", { validatorScores: scores });
  });

  // --- Calculate and Distribute XP After Voting ---
  socket.on("calculateXP", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    console.log(`💎 Calculating XP for room ${roomCode}`);

    // Calculate vote tallies
    const voteTallies = {};
    room.players.forEach((player) => {
      voteTallies[player.id] = 0;
    });

    Object.values(room.votes).forEach((votedPlayerId) => {
      if (voteTallies[votedPlayerId] !== undefined) {
        voteTallies[votedPlayerId]++;
      }
    });

    // Award XP based on votes received
    // Winner gets 100 XP, others get 10 XP per vote
    let maxVotes = 0;
    let winners = [];

    Object.entries(voteTallies).forEach(([playerId, votes]) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winners = [playerId];
      } else if (votes === maxVotes && votes > 0) {
        winners.push(playerId);
      }
    });

    // Distribute XP
    room.players.forEach((player) => {
      const votes = voteTallies[player.id] || 0;
      let xpGained = votes * 10; // 10 XP per vote

      if (winners.includes(player.id)) {
        xpGained += 100; // Bonus 100 XP for winner(s)
      }

      player.xp = (player.xp || 0) + xpGained;
    });

    console.log(`💎 XP distributed. Winners: ${winners.join(", ")}`);

    // Broadcast XP update
    io.to(roomCode).emit("xpDistributed", {
      players: room.players,
      voteTallies,
      winners,
    });
  });

  // --- Progress to Next Question ---
  socket.on("nextQuestion", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    // Store current question results
    if (!room.questionScores) {
      room.questionScores = [];
    }

    room.questionScores.push({
      questionIndex: room.currentQuestionIndex,
      votes: { ...room.votes },
      answers: { ...room.answers },
    });

    // Move to next question
    room.currentQuestionIndex = (room.currentQuestionIndex || 0) + 1;

    if (room.currentQuestionIndex < room.totalQuestions) {
      // Reset for next question
      room.answers = {};
      room.votes = {};

      // Pick a new topic for next question
      const randomTopic =
        GAME_TOPICS[Math.floor(Math.random() * GAME_TOPICS.length)];
      room.topic = randomTopic;

      console.log(
        `➡️ Moving to question ${room.currentQuestionIndex + 1}/${
          room.totalQuestions
        } in room ${roomCode}`
      );
      console.log(`🎲 New topic: ${randomTopic}`);

      io.to(roomCode).emit("nextQuestionReady", {
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.totalQuestions,
        topic: randomTopic,
      });
    } else {
      // All questions done, go to final leaderboard
      console.log(`🏁 All questions complete in room ${roomCode}`);
      io.to(roomCode).emit("allQuestionsComplete", {
        players: room.players,
      });
    }
  });

  // --- Host: End Room ---
  socket.on("endRoom", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("errorMessage", "❌ Room not found!");
      return;
    }

    if (room.hostId !== socket.id) {
      socket.emit("errorMessage", "❌ Only the host can end the room!");
      return;
    }

    console.log(`🛑 Host ${socket.id} ended room ${roomCode}`);

    io.to(roomCode).emit("roomEnded", {
      message: "The host has ended this room.",
      roomCode,
    });

    delete rooms[roomCode];
    io.emit("roomsUpdated", getRoomSummaries());
  });

  // --- Update XP / Leaderboard ---
  socket.on("updateXP", ({ roomCode, xp }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (player) {
      player.xp += xp;
      io.to(roomCode).emit("leaderboardUpdated", room.players);
    }
  });

  // --- Handle disconnect ---
  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);

    // Give a grace period before removing player (in case of quick reconnection)
    setTimeout(() => {
      for (let code in rooms) {
        const room = rooms[code];
        const idx = room.players.findIndex((p) => p.id === socket.id);

        if (idx !== -1) {
          const wasHost = room.hostId === socket.id;
          const wasOriginalHost = room.originalHostId === socket.id;

          // Only remove if still not connected after grace period
          const stillDisconnected = !io.sockets.sockets.has(socket.id);

          if (stillDisconnected) {
            room.players.splice(idx, 1);
            console.log(`👋 Player removed from ${code} after disconnect`);

            // Only transfer host if it was the original host who disconnected
            if (wasHost && room.players.length > 0) {
              room.hostId = room.players[0].id;

              // Don't transfer originalHostId - keep it for potential rejoin
              console.log(
                `👑 Host transferred to ${room.hostId} in room ${code}`
              );

              io.to(code).emit("hostTransferred", {
                newHostId: room.hostId,
                originalHostLeft: wasOriginalHost,
                message: wasOriginalHost
                  ? "The original host left. You are now the host!"
                  : "The host left. You are now the host!",
              });
            }

            io.to(code).emit("playerJoined", room);
          } else {
            console.log(`✅ Player ${socket.id} reconnected before removal`);
          }
        }

        // Delete room only if completely empty
        if (room.players.length === 0) {
          console.log(`🗑️ Room ${code} deleted (no players)`);
          delete rooms[code];
          delete socketToWallet[socket.id]; // Clean up wallet mapping
        }
      }

      io.emit("roomsUpdated", getRoomSummaries());
    }, 3000); // 3 second grace period
  });
});

// --- Helper: Broadcast all votes to players in a room ---
function broadcastVotes(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  // Calculate vote tallies for each player
  const voteTallies = {};
  room.players.forEach((player) => {
    voteTallies[player.id] = 0;
  });

  // Count votes
  Object.values(room.votes).forEach((votedPlayerId) => {
    if (voteTallies[votedPlayerId] !== undefined) {
      voteTallies[votedPlayerId]++;
    }
  });

  console.log(`📢 Broadcasting votes for room ${roomCode}:`, voteTallies);
  io.to(roomCode).emit("allVotesReceived", {
    votes: room.votes,
    voteTallies,
  });
}

// --- Helper: Broadcast all answers to players in a room ---
function broadcastAnswers(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  // Create arguments array with player info
  const argumentsData = room.players.map((player) => ({
    player: player,
    text: room.answers[player.id] || "No response provided",
  }));

  console.log(
    `📢 Broadcasting ${argumentsData.length} answers to room ${roomCode}`
  );
  io.to(roomCode).emit("allAnswersReceived", { argumentsData });
}

// --- Helper: Get summarized room list ---
function getRoomSummaries() {
  return Object.values(rooms).map((room) => ({
    id: room.id,
    players: room.players,
    playerCount: room.players.length,
    maxPlayers: room.maxPlayers,
    isStarted: room.isStarted,
    hostId: room.hostId,
  }));
}

server.listen(4000, () => {
  console.log("✅ Server running on port 4000");
});
