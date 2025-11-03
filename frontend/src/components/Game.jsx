import React, { useState, useEffect } from 'react';
import { Trophy, Users, Clock, Zap, Award, MessageSquare, ThumbsUp, Brain, CheckCircle } from 'lucide-react';

// Mock data for demo purposes
const MOCK_TOPICS = [
  "Is a hot dog a sandwich?",
  "Should AI have rights?",
  "Is cereal a soup?",
  "Are programmers artists or engineers?",
  "Is die hard a Christmas movie?"
];

const MOCK_PLAYERS = [
  { id: 1, name: "CryptoNinja", avatar: "🥷" },
  { id: 2, name: "BlockchainBob", avatar: "👨‍💻" },
  { id: 3, name: "DeFiQueen", avatar: "👑" },
  { id: 4, name: "ConsensusKing", avatar: "🤴" },
  { id: 5, name: "SmartContractSam", avatar: "🧙‍♂️" }
];

const GameStage = {
  LOBBY: 'lobby',
  TOPIC_REVEAL: 'topic_reveal',
  ARGUMENT: 'argument',
  VALIDATOR: 'validator',
  COMMUNITY_VOTE: 'community_vote',
  CONSENSUS: 'consensus',
  LEADERBOARD: 'leaderboard'
};

const ConsensusClash = () => {
  const [stage, setStage] = useState(GameStage.LOBBY);
  const [topic, setTopic] = useState('');
  const [timeLeft, setTimeLeft] = useState(180);
  const [players, setPlayers] = useState([]);
  const [currentPlayer] = useState(MOCK_PLAYERS[0]);
  const [myArgument, setMyArgument] = useState('');
  const [argument, setArgument] = useState([]);
  const [votes, setVotes] = useState({});
  const [validatorScores, setValidatorScores] = useState({});
  const [finalScores, setFinalScores] = useState([]);

  // Timer logic
  useEffect(() => {
    if ([GameStage.ARGUMENT, GameStage.COMMUNITY_VOTE].includes(stage) && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleStageComplete();
    }
  }, [timeLeft, stage]);

  const startGame = () => {
    setPlayers(MOCK_PLAYERS);
    setStage(GameStage.TOPIC_REVEAL);
    setTopic(MOCK_TOPICS[Math.floor(Math.random() * MOCK_TOPICS.length)]);
    setTimeout(() => {
      setStage(GameStage.ARGUMENT);
      setTimeLeft(120);
    }, 3000);
  };

  const submitArgument = () => {
    if (myArgument.trim().length < 20) {
      alert('Argument must be at least 20 characters!');
      return;
    }
    
    const newArguments = [
      ...MOCK_PLAYERS.slice(1).map(p => ({
        player: p,
        text: `Mock argument from ${p.name} about the topic. This is a sample argument that demonstrates the game flow.`
      })),
      {
        player: currentPlayer,
        text: myArgument
      }
    ];

    setArgument(newArguments);
    setStage(GameStage.VALIDATOR);
    
    // Simulate validator scoring
    setTimeout(() => {
      const scores = {};
      newArguments.forEach(arg => {
        scores[arg.player.id] = {
          creativity: Math.floor(Math.random() * 30) + 70,
          logic: Math.floor(Math.random() * 30) + 70,
          persuasiveness: Math.floor(Math.random() * 30) + 70
        };
      });
      setValidatorScores(scores);
      
      setTimeout(() => {
        setStage(GameStage.COMMUNITY_VOTE);
        setTimeLeft(120);
      }, 3000);
    }, 4000);
  };

  const handleVote = (playerId) => {
    if (playerId === currentPlayer.id) {
      alert("You can't vote for yourself!");
      return;
    }
    setVotes({ [currentPlayer.id]: playerId });
  };

  const handleStageComplete = () => {
    if (stage === GameStage.COMMUNITY_VOTE) {
      setStage(GameStage.CONSENSUS);
      
      setTimeout(() => {
        // Calculate final scores
        const scores = players.map(p => {
          const validatorScore = validatorScores[p.id];
          const avgValidator = validatorScore 
            ? (validatorScore.creativity + validatorScore.logic + validatorScore.persuasiveness) / 3
            : 0;
          
          const communityVotes = Object.values(votes).filter(v => v === p.id).length;
          const communityScore = (communityVotes / players.length) * 100;
          
          return {
            player: p,
            validatorScore: Math.round(avgValidator),
            communityScore: Math.round(communityScore),
            totalScore: Math.round((avgValidator * 0.6) + (communityScore * 0.4)),
            xp: Math.round(((avgValidator * 0.6) + (communityScore * 0.4)) * 10)
          };
        }).sort((a, b) => b.totalScore - a.totalScore);
        
        setFinalScores(scores);
        setStage(GameStage.LEADERBOARD);
      }, 3000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Lobby Screen
  if (stage === GameStage.LOBBY) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-black/30 backdrop-blur-lg rounded-3xl p-8 border border-purple-500/30">
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-2xl mb-4">
              <MessageSquare className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-5xl font-bold text-white mb-4">
              Consensus <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Clash</span>
            </h1>
            <p className="text-purple-200 text-lg mb-2">The Debate Arena</p>
            <p className="text-purple-300 text-sm">Powered by GenLayer's Optimistic Democracy</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-purple-200 bg-purple-500/10 p-4 rounded-xl">
              <Users className="w-5 h-5 flex-shrink-0" />
              <span>5-10 players per room</span>
            </div>
            <div className="flex items-center gap-3 text-purple-200 bg-purple-500/10 p-4 rounded-xl">
              <Clock className="w-5 h-5 flex-shrink-0" />
              <span>5-10 minute rounds</span>
            </div>
            <div className="flex items-center gap-3 text-purple-200 bg-purple-500/10 p-4 rounded-xl">
              <Brain className="w-5 h-5 flex-shrink-0" />
              <span>AI validators judge your arguments</span>
            </div>
            <div className="flex items-center gap-3 text-purple-200 bg-purple-500/10 p-4 rounded-xl">
              <Zap className="w-5 h-5 flex-shrink-0" />
              <span>Earn XP and climb the leaderboard</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold text-xl py-4 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Start Game
          </button>

          <div className="mt-6 text-center text-purple-300 text-sm">
            Playing as: {currentPlayer.avatar} {currentPlayer.name}
          </div>
        </div>
      </div>
    );
  }

  // Topic Reveal Screen
  if (stage === GameStage.TOPIC_REVEAL) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center animate-pulse">
          <div className="text-6xl mb-8">🎯</div>
          <h2 className="text-4xl font-bold text-white mb-4">Today's Topic</h2>
          <div className="max-w-2xl bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-purple-500/30">
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              {topic}
            </p>
          </div>
          <p className="text-purple-300 mt-6 text-lg">Get ready to argue...</p>
        </div>
      </div>
    );
  }

  // Argument Phase
  if (stage === GameStage.ARGUMENT) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-purple-500/30">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold text-xl mb-2">Topic: {topic}</h3>
                <div className="flex gap-4 text-purple-300">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" /> {players.length} Players
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="w-4 h-4" /> {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{formatTime(timeLeft)}</div>
                <div className="text-purple-300 text-sm">Time Remaining</div>
              </div>
            </div>
          </div>

          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
            <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Your Argument
            </h4>
            
            <textarea
              value={myArgument}
              onChange={(e) => setMyArgument(e.target.value)}
              placeholder="Write your persuasive argument here... Be creative, logical, and convincing!"
              className="w-full h-48 bg-purple-900/20 text-white placeholder-purple-400 rounded-xl p-4 border border-purple-500/30 focus:border-purple-500 focus:outline-none resize-none"
              maxLength={500}
            />
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-purple-300 text-sm">
                {myArgument.length}/500 characters
              </div>
              <button
                onClick={submitArgument}
                disabled={myArgument.length < 20}
                className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold px-8 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Argument
              </button>
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/30">
              <p className="text-blue-300 text-sm">
                💡 <strong>Tip:</strong> AI validators will judge your argument on creativity, logic, and persuasiveness. 
                Make it count!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Validator Phase
  if (stage === GameStage.VALIDATOR) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-2xl mb-4 animate-pulse">
              <Brain className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">AI Validators Analyzing...</h2>
            <p className="text-purple-300">Multiple LLM validators are scoring arguments on:</p>
          </div>

          <div className="space-y-4">
            {['Creativity', 'Logic', 'Persuasiveness'].map((criterion, idx) => (
              <div key={criterion} className="bg-black/30 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold">{criterion}</span>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="w-full bg-purple-900/30 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: validatorScores[currentPlayer.id]?.[criterion.toLowerCase()] ? '100%' : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
            <p className="text-purple-300 text-sm text-center">
              ⚖️ <strong>Optimistic Democracy in Action:</strong> Validators are reaching consensus on argument quality
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Community Vote Phase
  if (stage === GameStage.COMMUNITY_VOTE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-purple-500/30">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-xl">Vote for the Best Argument</h3>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{formatTime(timeLeft)}</div>
                <div className="text-purple-300 text-sm">Time Remaining</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {argument.map((arg, idx) => (
              <div
                key={idx}
                className={`bg-black/30 backdrop-blur-lg rounded-xl p-6 border transition-all ${
                  votes[currentPlayer.id] === arg.player.id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-purple-500/30 hover:border-purple-500'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{arg.player.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-bold">{arg.player.name}</span>
                      {validatorScores[arg.player.id] && (
                        <div className="flex gap-2 text-sm">
                          <span className="text-purple-300">AI Score: </span>
                          <span className="text-white font-bold">
                            {Math.round(
                              (validatorScores[arg.player.id].creativity +
                               validatorScores[arg.player.id].logic +
                               validatorScores[arg.player.id].persuasiveness) / 3
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-purple-200 mb-4">{arg.text}</p>
                    <button
                      onClick={() => handleVote(arg.player.id)}
                      disabled={arg.player.id === currentPlayer.id || votes[currentPlayer.id]}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${
                        votes[currentPlayer.id] === arg.player.id
                          ? 'bg-green-500 text-white'
                          : arg.player.id === currentPlayer.id
                          ? 'bg-gray-500/30 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-500 text-white hover:bg-purple-600'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      {votes[currentPlayer.id] === arg.player.id ? 'Voted!' : 'Vote'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Consensus Phase
  if (stage === GameStage.CONSENSUS) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 p-4 rounded-2xl mb-4 animate-spin">
            <Zap className="w-16 h-16 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Reaching Consensus...</h2>
          <p className="text-purple-300 mb-8">Combining AI validator scores with community votes</p>
          
          <div className="max-w-md mx-auto bg-black/30 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
            <div className="space-y-4">
              <div className="flex justify-between text-white">
                <span>AI Validator Weight:</span>
                <span className="font-bold">60%</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Community Vote Weight:</span>
                <span className="font-bold">40%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Leaderboard
  if (stage === GameStage.LEADERBOARD) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-2xl mb-4">
              <Trophy className="w-16 h-16 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-2">Final Results</h2>
            <p className="text-purple-300">XP Distribution via Optimistic Democracy</p>
          </div>

          <div className="space-y-4">
            {finalScores.map((score, idx) => (
              <div 
                key={idx}
                className={`bg-black/30 backdrop-blur-lg rounded-xl p-6 border transition-all ${
                  idx === 0 ? 'border-yellow-500 bg-yellow-500/10' :
                  idx === 1 ? 'border-gray-400 bg-gray-400/10' :
                  idx === 2 ? 'border-orange-600 bg-orange-600/10' :
                  'border-purple-500/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                  </div>
                  <div className="text-3xl">{score.player.avatar}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold text-xl">{score.player.name}</span>
                      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                        {score.xp} XP
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-purple-300">AI Score</div>
                        <div className="text-white font-bold">{score.validatorScore}</div>
                      </div>
                      <div>
                        <div className="text-purple-300">Community</div>
                        <div className="text-white font-bold">{score.communityScore}</div>
                      </div>
                      <div>
                        <div className="text-purple-300">Total</div>
                        <div className="text-white font-bold">{score.totalScore}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setStage(GameStage.LOBBY);
                setMyArgument('');
                setArgument([]);
                setVotes({});
                setValidatorScores({});
                setFinalScores([]);
              }}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold px-8 py-3 rounded-xl hover:from-purple-600 hover:to-blue-600 transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ConsensusClash;