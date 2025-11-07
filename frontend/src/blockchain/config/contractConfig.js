// src/config/contractConfig.js

/**
 * Contract addresses for different networks
 */
export const CONTRACT_ADDRESSES = {
  localhost: "0x...", // Replace after deployment
  sepolia: "0x552936d5B337588b5e19637d3CBe70388EED4e79", // Replace with Sepolia deployment
  base_sepolia: "0x...", // Replace with Mumbai deployment
};

/**
 * Get contract address for current network
 */
export const getContractAddress = (chainId) => {
  const addresses = {
    31337: CONTRACT_ADDRESSES.localhost,
    11155111: CONTRACT_ADDRESSES.sepolia,
    80001: CONTRACT_ADDRESSES.mumbai,
    84532: CONTRACT_ADDRESSES.base_sepolia,
  };

  return addresses[chainId] || CONTRACT_ADDRESSES.localhost;
};

/**
 * Contract ABI (simplified - replace with full ABI after compilation)
 */
export const CONTRACT_ABI = [
  "function registerPlayer(string memory name, string memory avatar) external",
  "function createRoom(string[5] memory questions) external returns (uint256)",
  "function joinRoom(uint256 roomId) external",
  "function startGame() external",
  "function nextStage() external",
  "function submitAnswer(string memory answer) external",
  "function castVote(address votedFor) external",

  "function getGameState() external view returns (uint256 roomId, uint256 gameId, uint8 stage, uint256 playerCount, uint256 stageStart)",
  "function getQuestions() external view returns (string[5] memory)",
  "function getPlayerInfo(address player) external view returns (tuple(string name, string avatar, uint256 totalXp, uint256 gamesPlayed, uint256 wins, bool registered))",
  "function getRoomPlayers() external view returns (address[] memory)",
  "function getPlayerAnswer(uint256 roomId, uint8 questionIndex, address player) external view returns (string memory text, uint256 timestamp, bool submitted)",
  "function getQuestionAnswers(uint8 questionIndex) external view returns (address[] memory, string[] memory)",
  "function getQuestionVotes(uint8 questionIndex, address player) external view returns (uint256)",
  "function hasVoted(uint8 questionIndex, address player) external view returns (bool)",
  "function getFinalRankings() external view returns (tuple(address playerAddress, string name, string avatar, uint256 totalVotes, uint256 totalScore, uint256 xp, uint256 rank)[] memory)",
  "function getPlayerScore(address player) external view returns (tuple(uint256 totalVotes, uint256 totalScore, uint256 xp))",
  "function getGlobalLeaderboard(uint256 offset, uint256 limit) external view returns (tuple(string name, string avatar, uint256 totalXp, uint256 gamesPlayed, uint256 wins, bool registered)[] memory)",

  "event PlayerRegistered(address indexed player, string name)",
  "event RoomCreated(uint256 indexed roomId, address indexed creator)",
  "event PlayerJoinedRoom(uint256 indexed roomId, address indexed player)",
  "event GameStarted(uint256 indexed roomId, uint256 indexed gameId)",
  "event StageChanged(uint256 indexed roomId, uint8 stage)",
  "event AnswerSubmitted(uint256 indexed roomId, address indexed player, uint8 questionIndex)",
  "event VoteCast(uint256 indexed roomId, uint8 questionIndex, address indexed voter, address indexed votedFor)",
  "event GameCompleted(uint256 indexed roomId, address winner, uint256 xp)",
];

/**
 * Game constants from contract
 */
export const GAME_CONSTANTS = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 10,
  TOTAL_QUESTIONS: 5,
  ANSWER_TIME_SECONDS: 180,
  VOTE_TIME_SECONDS: 30,
  MIN_ANSWER_LENGTH: 20,
  MAX_ANSWER_LENGTH: 500,
  STARTING_COUNTDOWN: 5,
};

/**
 * Stage mappings
 */
export const CONTRACT_STAGES = {
  LOBBY: 0,
  STARTING: 1,
  QUESTION_1: 2,
  QUESTION_2: 3,
  QUESTION_3: 4,
  QUESTION_4: 5,
  QUESTION_5: 6,
  VOTING_Q1: 7,
  VOTING_Q2: 8,
  VOTING_Q3: 9,
  VOTING_Q4: 10,
  VOTING_Q5: 11,
  RESULTS: 12,
  COMPLETED: 13,
};

/**
 * Default questions for testing
 */
export const DEFAULT_QUESTIONS = [
  "Is a hot dog a sandwich?",
  "Should AI have voting rights in the future?",
  "Is cereal a type of soup?",
  "Should we colonize Mars or fix Earth first?",
  "Is water wet?",
];
