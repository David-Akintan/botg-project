// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Battle of the Giants
 */
contract BattleOfTheGiants {
    // Game configuration
    uint8 public constant MIN_PLAYERS = 3;
    uint8 public constant MAX_PLAYERS = 10;
    uint256 public constant ARGUMENT_TIME_SECONDS = 180;
    uint256 public constant VOTE_TIME_SECONDS = 120;
    uint16 public constant MIN_ARGUMENT_LENGTH = 20;
    uint16 public constant MAX_ARGUMENT_LENGTH = 500;
    
    // Scoring weights (using basis points: 60% = 6000, 40% = 4000)
    uint16 public constant VALIDATOR_WEIGHT = 6000;
    uint16 public constant COMMUNITY_WEIGHT = 4000;
    uint16 public constant BASIS_POINTS = 10000;
    
    // Enums
    enum GameStage { Lobby, Active, Voting, Consensus, Completed }
    
    // Structs
    struct Player {
        string name;
        string avatar;
        uint256 totalXp;
        uint256 gamesPlayed;
        uint256 wins;
        bool registered;
    }
    
    struct ValidatorScores {
        uint8 creativity;
        uint8 logic;
        uint8 persuasiveness;
        bool scored;
    }
    
    struct Ranking {
        address playerAddress;
        string name;
        uint16 validatorScore;
        uint16 communityScore;
        uint16 totalScore;
        uint256 xp;
    }

    // Room data structure
    struct GameRoom {
        uint256 gameId;
        GameStage stage;
        string topic;
        uint256 startTime;
        address[] players;
        Ranking[] rankings;
        bool consensusReached;
        bool exists;
    }
    
    // State variables
    address public owner;
    uint256 public totalGames;
    string public weeklyTopic;
    uint256 public topicWeekNumber;
    
    // Current game state
    uint256 public currentGameId;
    GameStage public gameStage;
    string public gameTopic;
    uint256 public gameStartTime;
    
    // Player management
    mapping(address => Player) public registeredPlayers;
    address[] public roomPlayers;
    mapping(address => string) public playerArguments;
    mapping(address => address) public playerVotes;

    // Multi-room storage
    mapping(string => GameRoom) public gameRooms;
    mapping(string => mapping(address => string)) public roomPlayerArguments;
    mapping(string => mapping(address => address)) public roomPlayerVotes;
    mapping(string => mapping(address => ValidatorScores)) public roomValidatorScores;
    string[] public activeRoomCodes;
    
    // Validator scores (in real implementation, this would come from oracle)
    mapping(address => ValidatorScores) public validatorScores;
    bool public consensusReached;
    
    // Final results
    Ranking[] public finalRankings;
    
    // Events
    event PlayerRegistered(address indexed player, string name);
    event GameCreated(string indexed roomCode, uint256 indexed gameId, string topic);
    event PlayerJoined(string indexed roomCode, address indexed player);
    event GameStarted(string indexed roomCode, uint256 timestamp);
    event ArgumentSubmitted(string indexed roomCode, address indexed player);
    event ValidatorScoresSet(string indexed roomCode, address indexed player, uint8 creativity, uint8 logic, uint8 persuasiveness);
    event VoteCast(string indexed roomCode, address indexed voter, address indexed votedFor);
    event GameCompleted(string indexed roomCode, address winner);
    event WeeklyTopicSet(string topic, uint256 weekNumber);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyRegistered() {
        require(registeredPlayers[msg.sender].registered, "Must register first");
        _;
    }
    
    constructor() {
        owner = msg.sender;
       
    }
    
    /**
     * @notice Register a new player or update existing player info
     */
    function registerPlayer(string memory _name, string memory _avatar) external {
        if (!registeredPlayers[msg.sender].registered) {
            registeredPlayers[msg.sender] = Player({
                name: _name,
                avatar: _avatar,
                totalXp: 0,
                gamesPlayed: 0,
                wins: 0,
                registered: true
            });
        } else {
            registeredPlayers[msg.sender].name = _name;
            registeredPlayers[msg.sender].avatar = _avatar;
        }
        
        emit PlayerRegistered(msg.sender, _name);
    }
    
    /**
     * @notice Set weekly topic (in production, this would come from Chainlink VRF + AI oracle)
     * @dev Replacing LLM call with manual setter for now
     */
    function setWeeklyTopic(string memory _topic) external onlyOwner {
        uint256 currentWeek = getCurrentWeek();
        require(currentWeek > topicWeekNumber, "Topic already set");
        
        weeklyTopic = _topic;
        topicWeekNumber = currentWeek;
        
        emit WeeklyTopicSet(_topic, currentWeek);
    }
    
    /**
     * @notice Create a new game room
     */
    function createGameRoom(string memory _roomCode) external onlyRegistered returns (uint256) {
        require(!gameRooms[_roomCode].exists, "Room already exists");
        require(bytes(weeklyTopic).length > 0, "No topic set");
        
        totalGames++;
        uint256 newGameId = totalGames;
        
        GameRoom storage room = gameRooms[_roomCode];
        room.gameId = newGameId;
        room.stage = GameStage.Lobby;
        room.topic = weeklyTopic;
        room.exists = true;
        
        activeRoomCodes.push(_roomCode);
        
        emit GameCreated(_roomCode, newGameId, weeklyTopic);
        return newGameId;
    }
    
    /**
     * @notice Join the current game room
     */
    function joinGameRoom(string memory _roomCode) external onlyRegistered {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        require(room.stage == GameStage.Lobby, "Cannot join");
        require(!isInRoom(_roomCode, msg.sender), "Already in room");
        require(room.players.length < MAX_PLAYERS, "Room full");
        
        room.players.push(msg.sender);
        emit PlayerJoined(_roomCode, msg.sender);
    }
    
    /**
     * @notice Start the game
     */
    function startGame(string memory _roomCode) external {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        require(room.stage == GameStage.Lobby, "Game already started");
        require(room.players.length >= MIN_PLAYERS, "Need more players");
        
        room.stage = GameStage.Active;
        room.startTime = block.timestamp;
        
        emit GameStarted(_roomCode, block.timestamp);
    }
    
    /**
     * @notice Submit an argument
     */
    function submitArgument(string memory _roomCode, string memory _argument) external {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        require(room.stage == GameStage.Active, "Not in argument phase");
        require(isInRoom(_roomCode, msg.sender), "Not in game");
        require(bytes(roomPlayerArguments[_roomCode][msg.sender]).length == 0, "Already submitted");
        require(bytes(_argument).length >= MIN_ARGUMENT_LENGTH, "Too short");
        require(bytes(_argument).length <= MAX_ARGUMENT_LENGTH, "Too long");
        
        roomPlayerArguments[_roomCode][msg.sender] = _argument;
        emit ArgumentSubmitted(_roomCode, msg.sender);
        
        // Check if all players submitted
        if (countSubmittedArguments(_roomCode) == room.players.length) {
            room.stage = GameStage.Voting;
        }
    }
    
    /**
     * @notice Set validator scores (oracle/owner function)
     * @dev In production, this would be called by Chainlink Functions or similar oracle
     */
    function setValidatorScores(
        string memory _roomCode,
        address _player,
        uint8 _creativity,
        uint8 _logic,
        uint8 _persuasiveness
    ) external onlyOwner {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        require(room.stage == GameStage.Active || room.stage == GameStage.Voting, "Invalid stage");
        require(isInRoom(_roomCode, _player), "Player not in game");
        require(_creativity <= 100 && _logic <= 100 && _persuasiveness <= 100, "Invalid scores");
        
        roomValidatorScores[_roomCode][_player] = ValidatorScores({
            creativity: _creativity,
            logic: _logic,
            persuasiveness: _persuasiveness,
            scored: true
        });
        
        emit ValidatorScoresSet(_roomCode, _player, _creativity, _logic, _persuasiveness);
    }
    
    /**
     * @notice Cast vote for best argument
     */
    function castVote(string memory _roomCode, address _votedFor) external {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        require(room.stage == GameStage.Voting, "Not voting phase");
        require(isInRoom(_roomCode, msg.sender), "Not in game");
        require(roomPlayerVotes[_roomCode][msg.sender] == address(0), "Already voted");
        require(isInRoom(_roomCode, _votedFor), "Invalid target");
        require(_votedFor != msg.sender, "Cannot self-vote");

        roomPlayerVotes[_roomCode][msg.sender] = _votedFor;
        emit VoteCast(_roomCode, msg.sender, _votedFor);
        
        // Check if all voted
        if (countVotes(_roomCode) == room.players.length) {
            calculateFinalScores(_roomCode);
        }
    }
    
    /**
     * @notice Calculate final scores and distribute XP
     */
    function calculateFinalScores(string memory _roomCode) public {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        require(room.stage == GameStage.Voting, "Invalid stage");
        require(countVotes(_roomCode) == room.players.length, "Not all voted");
        
        delete room.rankings;
        
        for (uint i = 0; i < room.players.length; i++) {
            address player = room.players[i];
            
            // Calculate average validator score
            uint16 avgValidator = 0;
            if (roomValidatorScores[_roomCode][player].scored) {
                ValidatorScores memory scores = roomValidatorScores[_roomCode][player];
                avgValidator = uint16((uint256(scores.creativity) + 
                                      uint256(scores.logic) + 
                                      uint256(scores.persuasiveness)) / 3);
            }
            
            // Calculate community score
            uint256 votesReceived = countVotesFor(_roomCode, player);
            uint16 communityScore = uint16((votesReceived * 100) / room.players.length);
            
            // Weighted total score
            uint16 totalScore = uint16((uint256(avgValidator) * VALIDATOR_WEIGHT + 
                                       uint256(communityScore) * COMMUNITY_WEIGHT) / BASIS_POINTS);
            
            // Calculate XP
            uint256 xp = uint256(totalScore) * 10;
            
            room.rankings.push(Ranking({
                playerAddress: player,
                name: registeredPlayers[player].name,
                validatorScore: avgValidator,
                communityScore: communityScore,
                totalScore: totalScore,
                xp: xp
            }));
        }
        
        // Sort rankings (bubble sort for simplicity)
        sortRankings(_roomCode);
        
        // Update player stats
        updatePlayerStats(_roomCode);
        
        room.stage = GameStage.Completed;
        room.consensusReached = true;
        
        emit GameCompleted(_roomCode, room.rankings[0].playerAddress);
    }
    
    /**
     * @notice Update player stats after game
     */
    function updatePlayerStats(string memory _roomCode) internal {
        GameRoom storage room = gameRooms[_roomCode];
        
        for (uint i = 0; i < room.rankings.length; i++) {
            address player = room.rankings[i].playerAddress;
            uint256 xp = room.rankings[i].xp;
            
            registeredPlayers[player].totalXp += xp;
            registeredPlayers[player].gamesPlayed++;
            
            if (i == 0) {
                registeredPlayers[player].wins++;
            }
        }
    }
    
    /**
     * @notice Sort rankings by total score (descending)
     */
    function sortRankings(string memory _roomCode) internal {
        GameRoom storage room = gameRooms[_roomCode];
        uint n = room.rankings.length;
        for (uint i = 0; i < n - 1; i++) {
            for (uint j = 0; j < n - i - 1; j++) {
                if (room.rankings[j].totalScore < room.rankings[j + 1].totalScore) {
                    Ranking memory temp = room.rankings[j];
                    room.rankings[j] = room.rankings[j + 1];
                    room.rankings[j + 1] = temp;
                }
            }
        }
    }
    
    /**
     * @notice Reset game (emergency only)
     */
    function resetGame(string memory _roomCode) external onlyOwner {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        
        room.stage = GameStage.Lobby;
        delete room.players;
        delete room.rankings;
        room.consensusReached = false;
    }
    
    // View functions
    
    function getGameState(string memory _roomCode) external view returns (
        uint256 gameId,
        GameStage stage,
        string memory topic,
        uint256 playerCount,
        uint256 argumentsSubmitted,
        uint256 votesCast,
        bool consensus
    ) {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        
        return (
            room.gameId,
            room.stage,
            room.topic,
            room.players.length,
            countSubmittedArguments(_roomCode),
            countVotes(_roomCode),
            room.consensusReached
        );
    }
    
    function getPlayerInfo(address _player) external view returns (Player memory) {
        return registeredPlayers[_player];
    }
    
    function getRoomPlayers(string memory _roomCode) external view returns (address[] memory) {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        return room.players;
    }
    
    function getFinalRankings(string memory _roomCode) external view returns (Ranking[] memory) {
        GameRoom storage room = gameRooms[_roomCode];
        require(room.exists, "Room not found");
        require(room.stage == GameStage.Completed, "Not completed");
        return room.rankings;
    }
    
    function getWeeklyLeaderboard(uint256 _limit) external view returns (Ranking[] memory) {
        // Note: This is a simplified version. In production, use off-chain indexing
        require(_limit <= 100, "Limit too high");
        // Implementation would require storing all players in array
        // Simplified for demonstration
        return finalRankings;
    }
    
    function getCurrentWeek() public view returns (uint256) {
        return block.timestamp / (7 days);
    }
    
    // Helper functions
    
    function isInRoom(string memory _roomCode, address _player) internal view returns (bool) {
        GameRoom storage room = gameRooms[_roomCode];
        for (uint i = 0; i < room.players.length; i++) {
            if (room.players[i] == _player) return true;
        }
        return false;
    }
    
    function countSubmittedArguments(string memory _roomCode) internal view returns (uint256) {
        GameRoom storage room = gameRooms[_roomCode];
        uint256 count = 0;
        for (uint i = 0; i < room.players.length; i++) {
            if (bytes(roomPlayerArguments[_roomCode][room.players[i]]).length > 0) {
                count++;
            }
        }
        return count;
    }
    
    function countVotes(string memory _roomCode) internal view returns (uint256) {
        GameRoom storage room = gameRooms[_roomCode];
        uint256 count = 0;
        for (uint i = 0; i < room.players.length; i++) {
            if (roomPlayerVotes[_roomCode][room.players[i]] != address(0)) {
                count++;
            }
        }
        return count;
    }
    
    function countVotesFor(string memory _roomCode, address _player) internal view returns (uint256) {
        GameRoom storage room = gameRooms[_roomCode];
        uint256 count = 0;
        for (uint i = 0; i < room.players.length; i++) {
            if (roomPlayerVotes[_roomCode][room.players[i]] == _player) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Get list of active room codes
     */
    function getActiveRooms() external view returns (string[] memory) {
        return activeRoomCodes;
    }
    
    /**
     * @notice Check if a room exists
     */
    function roomExists(string memory _roomCode) external view returns (bool) {
        return gameRooms[_roomCode].exists;
    }
}