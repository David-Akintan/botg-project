import { ethers } from 'ethers';

async function testBlockchain() {
  console.log('🧪 Testing Blockchain Integration...\n');

  // Connect to local node
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  // Get test accounts
  const [deployer, player1, player2] = await provider.listAccounts();
  
  console.log('📋 Test Accounts:');
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Player 1: ${player1.address}`);
  console.log(`Player 2: ${player2.address}\n`);

  // Load contract
  const contractAddress = process.env.VITE_CONTRACT_ADDRESS;
  const ConsensusClash = require('./artifacts/contracts/ConsensusClash.sol/ConsensusClash.json');
  
  const contract = new ethers.Contract(
    contractAddress,
    ConsensusClash.abi,
    deployer
  );

  try {
    // Test 1: Register players
    console.log('1️⃣ Registering players...');
    let tx = await contract.connect(player1).registerPlayer('socket_player1');
    await tx.wait();
    console.log('✅ Player 1 registered');

    tx = await contract.connect(player2).registerPlayer('socket_player2');
    await tx.wait();
    console.log('✅ Player 2 registered\n');

    // Test 2: Submit answers
    console.log('2️⃣ Submitting answers...');
    tx = await contract.connect(player1).submitAnswer(
      'TEST_ROOM',
      0,
      'This is player 1 answer for testing'
    );
    await tx.wait();
    console.log('✅ Player 1 answer submitted');

    tx = await contract.connect(player2).submitAnswer(
      'TEST_ROOM',
      0,
      'This is player 2 answer for testing'
    );
    await tx.wait();
    console.log('✅ Player 2 answer submitted\n');

    // Test 3: Submit votes
    console.log('3️⃣ Submitting votes...');
    tx = await contract.connect(player1).submitVote(
      'TEST_ROOM',
      0,
      player2.address
    );
    await tx.wait();
    console.log('✅ Player 1 voted for Player 2');

    tx = await contract.connect(player2).submitVote(
      'TEST_ROOM',
      0,
      player1.address
    );
    await tx.wait();
    console.log('✅ Player 2 voted for Player 1\n');

    // Test 4: Verify data
    console.log('4️⃣ Verifying stored data...');
    const answer1 = await contract.getAnswer('TEST_ROOM', 0, player1.address);
    const answer2 = await contract.getAnswer('TEST_ROOM', 0, player2.address);
    
    console.log(`Answer 1: ${answer1.answerText}`);
    console.log(`Answer 2: ${answer2.answerText}\n`);

    console.log('✅ All tests passed!');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

testBlockchain();