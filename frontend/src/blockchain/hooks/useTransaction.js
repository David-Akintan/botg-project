import { useState } from 'react';

export const useTransaction = (socket, roomInfo) => {
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const executeTransaction = async (txFunction, actionName, onSuccess) => {
    setIsPending(true);
    setError(null);
    setTxHash(null);

    // Notify others that transaction is starting
    if (socket && roomInfo) {
      socket.emit('txPending', {
        roomCode: roomInfo.id,
        action: actionName,
        player: socket.id
      });
    }

    try {
      // Execute the transaction
      const tx = await txFunction();
      setTxHash(tx.hash);

      console.log(`⏳ Transaction sent: ${tx.hash}`);
      console.log(`⏳ Waiting for confirmation...`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);

      // Notify others that transaction succeeded
      if (socket && roomInfo) {
        socket.emit('txConfirmed', {
          roomCode: roomInfo.id,
          action: actionName,
          txHash: tx.hash,
          blockNumber: receipt.blockNumber
        });
      }

      setIsPending(false);

      // Execute success callback
      if (onSuccess) {
        onSuccess(receipt);
      }

      return receipt;
    } catch (err) {
      console.error(`❌ Transaction failed:`, err);
      setError(err.message || 'Transaction failed');
      setIsPending(false);

      // Notify others that transaction failed
      if (socket && roomInfo) {
        socket.emit('txFailed', {
          roomCode: roomInfo.id,
          action: actionName,
          error: err.message
        });
      }

      throw err;
    }
  };

  return {
    executeTransaction,
    isPending,
    txHash,
    error
  };
};