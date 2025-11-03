# { "Depends": "py-genlayer:test" }
from genlayer import *

class ConsensusClash(gl.Contract):
    """
    Consensus Clash - A debate game showcasing GenLayer's Optimistic Democracy
    
    Players argue on topics, AI validators judge quality, and community votes.
    XP is distributed based on combined scores through consensus.
    """
    
    # Game configuration
    MIN_PLAYERS: int = 3
    MAX_PLAYERS: int = 10
    ARGUMENT_TIME_SECONDS: int = 180
    VOTE_TIME_SECONDS: int = 120
    MIN_ARGUMENT_LENGTH: int = 20
    MAX_ARGUMENT_LENGTH: int = 500
    
    # Scoring weights
    VALIDATOR_WEIGHT: float = 0.6
    COMMUNITY_WEIGHT: float = 0.4
    
    # State variables
    owner: str
    total_games: int
    weekly_topic: str
    topic_week_number: int
    
    # Current game state
    current_game_id: int
    game_stage: str  # 'lobby', 'active', 'voting', 'consensus', 'completed'
    game_topic: str
    game_start_time: int
    
    # Player management
    registered_players: dict  # {address: {name, avatar, total_xp, games_played}}
    room_players: list  # [addresses in current game]
    player_arguments: dict  # {address: argument_text}
    player_votes: dict  # {voter_address: voted_for_address}
    
    # Validator scores
    validator_scores: dict  # {address: {creativity, logic, persuasiveness}}
    consensus_reached: bool
    
    # Final results
    final_rankings: list  # [{address, validator_score, community_score, total_score, xp}]
    
    # Weekly leaderboard
    weekly_leaderboard: list  # [{address, total_xp, wins}]
    
    def __init__(self):
        self.owner = gl.msg_sender
        self.total_games = 0
        self.weekly_topic = ""
        self.topic_week_number = 0
        self.current_game_id = 0
        self.game_stage = "lobby"
        self.game_topic = ""
        self.game_start_time = 0
        self.registered_players = {}
        self.room_players = []
        self.player_arguments = {}
        self.player_votes = {}
        self.validator_scores = {}
        self.consensus_reached = False
        self.final_rankings = []
        self.weekly_leaderboard = []
    
    @gl.public.write
    def register_player(self, name: str, avatar: str):
        """Register a new player or update existing player info"""
        address = gl.msg_sender
        
        if address not in self.registered_players:
            self.registered_players[address] = {
                "name": name,
                "avatar": avatar,
                "total_xp": 0,
                "games_played": 0,
                "wins": 0
            }
        else:
            self.registered_players[address]["name"] = name
            self.registered_players[address]["avatar"] = avatar
    
    @gl.public.write
    def generate_weekly_topic(self) -> str:
        """
        Generate a new debate topic for the week using LLM
        Can only be called once per week by owner
        """
        assert gl.msg_sender == self.owner, "Only owner can generate topics"
        
        current_week = self._get_current_week()
        assert current_week > self.topic_week_number, "Topic already set for this week"
        
        prompt = """Generate a fun, engaging debate topic for a blockchain community game.
        The topic should be:
        - Light-hearted but thought-provoking
        - Something people can have strong but friendly opinions about
        - Universal (not requiring specialized knowledge)
        - Maximum 15 words
        
        Examples:
        - Is a hot dog a sandwich?
        - Should AI have voting rights?
        - Is cereal a type of soup?
        
        Provide only the topic question, nothing else."""
        
        self.weekly_topic = gl.llm_call(prompt)
        self.topic_week_number = current_week
        
        return self.weekly_topic
    
    @gl.public.write
    def create_game_room(self) -> int:
        """Create a new game room and return game ID"""
        assert self.game_stage == "lobby", "A game is already in progress"
        assert gl.msg_sender in self.registered_players, "Must register first"
        assert self.weekly_topic != "", "No topic set for this week"
        
        self.current_game_id += 1
        self.total_games += 1
        self.game_stage = "lobby"
        self.game_topic = self.weekly_topic
        self.room_players = []
        self.player_arguments = {}
        self.player_votes = {}
        self.validator_scores = {}
        self.consensus_reached = False
        self.final_rankings = []
        
        return self.current_game_id
    
    @gl.public.write
    def join_game_room(self):
        """Join the current game room"""
        address = gl.msg_sender
        
        assert self.game_stage == "lobby", "Cannot join game in progress"
        assert address in self.registered_players, "Must register first"
        assert address not in self.room_players, "Already in room"
        assert len(self.room_players) < self.MAX_PLAYERS, "Room is full"
        
        self.room_players.append(address)
    
    @gl.public.write
    def start_game(self):
        """Start the game (requires minimum players)"""
        assert self.game_stage == "lobby", "Game already started"
        assert len(self.room_players) >= self.MIN_PLAYERS, f"Need at least {self.MIN_PLAYERS} players"
        
        self.game_stage = "active"
        self.game_start_time = gl.block.timestamp
    
    @gl.public.write
    def submit_argument(self, argument: str):
        """Submit an argument for the current topic"""
        address = gl.msg_sender
        
        assert self.game_stage == "active", "Game not in argument phase"
        assert address in self.room_players, "Not in this game"
        assert address not in self.player_arguments, "Already submitted argument"
        assert len(argument) >= self.MIN_ARGUMENT_LENGTH, f"Argument too short (min {self.MIN_ARGUMENT_LENGTH} chars)"
        assert len(argument) <= self.MAX_ARGUMENT_LENGTH, f"Argument too long (max {self.MAX_ARGUMENT_LENGTH} chars)"
        
        self.player_arguments[address] = argument
        
        # If all players submitted, move to validator phase
        if len(self.player_arguments) == len(self.room_players):
            self._trigger_validator_scoring()
    
    @gl.public.write
    def _trigger_validator_scoring(self):
        """
        Internal method to trigger AI validator scoring
        This showcases GenLayer's non-deterministic consensus
        """
        assert self.game_stage == "active", "Invalid stage"
        
        # Score each argument using multiple AI validators
        for address, argument in self.player_arguments.items():
            scores = self._evaluate_argument(argument, self.game_topic)
            self.validator_scores[address] = scores
        
        # Move to voting stage
        self.game_stage = "voting"
    
    @gl.public.write
    def _evaluate_argument(self, argument: str, topic: str) -> dict:
        """
        Use LLM to evaluate argument quality
        This demonstrates GenLayer's AI-powered validation
        """
        prompt = f"""You are a debate judge evaluating arguments. 
        
Topic: {topic}
Argument: {argument}

Rate this argument on three criteria (0-100 scale):
1. Creativity: How original and creative is the argument?
2. Logic: How logical and well-reasoned is the argument?
3. Persuasiveness: How convincing and impactful is the argument?

Respond ONLY with a JSON object in this exact format:
{{"creativity": <score>, "logic": <score>, "persuasiveness": <score>}}

Be fair but critical. Reserve high scores (90+) for truly exceptional arguments."""
        
        # Call LLM with equivalence principle for consensus
        response = gl.llm_call(
            prompt,
            eq_principle={
                "type": "percentage_similarity",
                "threshold": 0.85,
                "description": "Validators must reach ~85% agreement on scores"
            }
        )
        
        # Parse JSON response
        import json
        scores = json.loads(response)
        
        # Validate scores are in range
        for key in ["creativity", "logic", "persuasiveness"]:
            assert key in scores, f"Missing score: {key}"
            assert 0 <= scores[key] <= 100, f"Invalid score range for {key}"
        
        return scores
    
    @gl.public.write
    def cast_vote(self, voted_for: str):
        """Cast vote for best argument (community voting)"""
        voter = gl.msg_sender
        
        assert self.game_stage == "voting", "Not in voting phase"
        assert voter in self.room_players, "Not in this game"
        assert voter not in self.player_votes, "Already voted"
        assert voted_for in self.room_players, "Invalid vote target"
        assert voted_for != voter, "Cannot vote for yourself"
        
        self.player_votes[voter] = voted_for
        
        # If all players voted, move to consensus
        if len(self.player_votes) == len(self.room_players):
            self._calculate_final_scores()
    
    @gl.public.write
    def _calculate_final_scores(self):
        """
        Calculate final scores combining validator and community votes
        This demonstrates Optimistic Democracy in action
        """
        assert self.game_stage == "voting", "Invalid stage"
        
        rankings = []
        
        for address in self.room_players:
            # Calculate average validator score
            if address in self.validator_scores:
                v_scores = self.validator_scores[address]
                avg_validator = (
                    v_scores["creativity"] + 
                    v_scores["logic"] + 
                    v_scores["persuasiveness"]
                ) / 3.0
            else:
                avg_validator = 0.0
            
            # Calculate community vote score
            votes_received = sum(1 for v in self.player_votes.values() if v == address)
            community_score = (votes_received / len(self.room_players)) * 100.0
            
            # Weighted total score
            total_score = (
                avg_validator * self.VALIDATOR_WEIGHT + 
                community_score * self.COMMUNITY_WEIGHT
            )
            
            # Calculate XP (scaled by 10)
            xp = int(total_score * 10)
            
            rankings.append({
                "address": address,
                "name": self.registered_players[address]["name"],
                "validator_score": int(avg_validator),
                "community_score": int(community_score),
                "total_score": int(total_score),
                "xp": xp
            })
        
        # Sort by total score descending
        rankings.sort(key=lambda x: x["total_score"], reverse=True)
        self.final_rankings = rankings
        
        # Update player stats
        self._update_player_stats()
        
        self.game_stage = "completed"
        self.consensus_reached = True
    
    @gl.public.write
    def _update_player_stats(self):
        """Update player XP and stats after game completion"""
        for i, ranking in enumerate(self.final_rankings):
            address = ranking["address"]
            xp = ranking["xp"]
            
            self.registered_players[address]["total_xp"] += xp
            self.registered_players[address]["games_played"] += 1
            
            # Track wins (1st place)
            if i == 0:
                self.registered_players[address]["wins"] += 1
    
    @gl.public.view
    def get_game_state(self) -> dict:
        """Get current game state"""
        return {
            "game_id": self.current_game_id,
            "stage": self.game_stage,
            "topic": self.game_topic,
            "players": len(self.room_players),
            "arguments_submitted": len(self.player_arguments),
            "votes_cast": len(self.player_votes),
            "consensus_reached": self.consensus_reached
        }
    
    @gl.public.view
    def get_player_info(self, address: str) -> dict:
        """Get player information"""
        if address not in self.registered_players:
            return None
        return self.registered_players[address]
    
    @gl.public.view
    def get_room_players(self) -> list:
        """Get list of players in current room"""
        return [
            {
                "address": addr,
                "name": self.registered_players[addr]["name"],
                "avatar": self.registered_players[addr]["avatar"]
            }
            for addr in self.room_players
        ]
    
    @gl.public.view
    def get_arguments(self) -> list:
        """Get all submitted arguments (anonymized during voting)"""
        if self.game_stage not in ["voting", "completed"]:
            return []
        
        arguments = []
        for address, text in self.player_arguments.items():
            arg_data = {
                "text": text,
                "player_name": self.registered_players[address]["name"],
                "player_avatar": self.registered_players[address]["avatar"]
            }
            
            # Include validator scores if available
            if address in self.validator_scores:
                arg_data["validator_scores"] = self.validator_scores[address]
            
            arguments.append(arg_data)
        
        return arguments
    
    @gl.public.view
    def get_final_rankings(self) -> list:
        """Get final rankings and XP distribution"""
        assert self.game_stage == "completed", "Game not completed yet"
        return self.final_rankings
    
    @gl.public.view
    def get_weekly_leaderboard(self) -> list:
        """Get weekly leaderboard sorted by total XP"""
        current_week = self._get_current_week()
        
        # Build leaderboard from all registered players
        leaderboard = []
        for address, player_data in self.registered_players.items():
            leaderboard.append({
                "address": address,
                "name": player_data["name"],
                "avatar": player_data["avatar"],
                "total_xp": player_data["total_xp"],
                "games_played": player_data["games_played"],
                "wins": player_data["wins"]
            })
        
        # Sort by XP descending
        leaderboard.sort(key=lambda x: x["total_xp"], reverse=True)
        
        return leaderboard[:100]  # Top 100
    
    @gl.public.view
    def get_weekly_topic(self) -> str:
        """Get current week's debate topic"""
        return self.weekly_topic
    
    @gl.public.view
    def can_play_this_week(self, address: str) -> bool:
        """Check if player has already played this week"""
        # In production, implement weekly play restriction
        # For now, allow multiple plays for testing
        return True
    
    @gl.public.write
    def reset_game(self):
        """Reset game to lobby (owner only, for emergencies)"""
        assert gl.msg_sender == self.owner, "Only owner can reset"
        
        self.game_stage = "lobby"
        self.room_players = []
        self.player_arguments = {}
        self.player_votes = {}
        self.validator_scores = {}
        self.consensus_reached = False
        self.final_rankings = []
    
    def _get_current_week(self) -> int:
        """Get current week number of the year"""
        # Simplified: week number based on days since epoch
        return gl.block.timestamp // (7 * 24 * 60 * 60)
    
    @gl.public.view
    def get_contract_stats(self) -> dict:
        """Get overall contract statistics"""
        return {
            "total_games": self.total_games,
            "total_players": len(self.registered_players),
            "current_week": self._get_current_week(),
            "weekly_topic": self.weekly_topic,
            "active_room_players": len(self.room_players)
        }