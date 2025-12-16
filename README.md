# ⚔️ Battle of the Giants

An interactive multiplayer debate game powered by blockchain technology.

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Smart Contract](#smart-contract)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)

## About

Battle of the Giants is an innovative multiplayer debate game where players compete in structured argumentation battles. Players join rooms, receive debate topics, present arguments, and vote on the best arguments. The game leverages blockchain technology for transparent scoring and rewards distribution.

## Features

- 🎮 **Multiplayer Debate Gameplay**: Real-time multiplayer debates with structured phases
- 🔗 **Blockchain Integration**: Smart contract-based scoring and reward system
- 🏆 **Dual Scoring System**: Combination of AI validator scores and community voting
- 📊 **Real-time Leaderboards**: Live ranking updates based on player performance
- 💰 **XP Rewards**: Earn experience points based on argument quality and popularity
- 🤖 **Simulation Mode**: Play against AI bots when human players aren't available
- 🌐 **Farcaster Integration**: Share results and connect with the Farcaster social network
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- Socket.IO Client
- Ethers.js
- Viem
- Lucide React Icons

### Backend

- Node.js
- Express
- Socket.IO
- Ethers.js

### Blockchain

- Solidity Smart Contracts
- Hardhat (Development & Deployment)
- Base Network (Main Deployment)
- Celo Network (Alternative)
- Sepolia Testnet (Testing)

### Additional Tools

- Farcaster Integration
- GenLayer Client

## Project Structure

```
frontend/
├── contracts/                 # Solidity smart contracts
├── public/                    # Static assets
├── scripts/                   # Deployment and utility scripts
├── src/
│   ├── blockchain/            # Blockchain integration hooks and configs
│   ├── components/            # React components organized by feature
│   ├── farcaster/             # Farcaster integration
│   ├── styles/                # CSS stylesheets
│   ├── utils/                 # Utility functions
│   ├── App.jsx                # Main application component
│   └── main.jsx               # Entry point
├── .env                       # Environment variables
├── hardhat.config.js          # Hardhat configuration
└── vite.config.js             # Vite configuration

server/
├── routes/                    # Express route handlers
├── scripts/                   # Server utility scripts
├── server.js                  # Main server application
└── vercel.json                # Vercel deployment configuration
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or compatible wallet

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd BOTG-Project
   ```

2. Install frontend dependencies:

   ```bash
   cd frontend
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd ../server
   npm install
   ```

### Running the Application

#### Frontend Development Server

```bash
cd frontend
npm run dev
```

#### Backend Server

```bash
cd server
node server.js
```

## Smart Contract

The game logic is implemented in a Solidity smart contract located at `frontend/contracts/contract.sol`. Key features include:

- Player registration and management
- Game room creation and lifecycle
- Argument submission and validation
- Voting mechanism
- Score calculation using weighted averages
- Experience point distribution
- Leaderboard generation

### Key Contract Functions

- `registerPlayer()` - Register or update player information
- `createGameRoom()` - Create a new game room
- `joinGameRoom()` - Join an existing game room
- `startGame()` - Begin the game in a room
- `submitArgument()` - Submit an argument for the current topic
- `castVote()` - Vote for the best argument
- `setValidatorScores()` - Set AI validator scores (owner/Oracle function)
- `calculateFinalScores()` - Calculate final scores and distribute XP

## Environment Variables

### Frontend (.env)

```env
VITE_API_URL=http://localhost:4000
VITE_RPC_URL=
VITE_CONTRACT_ADDRESS=
```

### Backend (.env)

```env
RPC_URL=
PRIVATE_KEY=
CONTRACT_ADDRESS=
BLOCKCHAIN_ENABLED=true
```

## Deployment

### Frontend

Deployed using Vercel with configuration in `vercel.json`.

### Backend

Deployed as a Node.js application on Vercel.

### Smart Contracts

Deployed using Hardhat with support for Base and Celo networks.
