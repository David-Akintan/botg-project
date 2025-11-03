import React, { useEffect, useState } from 'react';
import '../../styles/components/blockchain/TransactionStatus.css';

export default function TransactionStatus({ socket, roomInfo }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleTxPending = ({ action, player }) => {
      const notification = {
        id: Date.now(),
        type: 'pending',
        message: `${action} - Transaction pending...`,
        timestamp: Date.now()
      };
      setNotifications(prev => [...prev, notification]);

      // Auto-remove after 15 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 15000);
    };

    const handleTxConfirmed = ({ action, txHash }) => {
      const notification = {
        id: Date.now(),
        type: 'success',
        message: `✅ ${action} confirmed!`,
        txHash,
        timestamp: Date.now()
      };
      setNotifications(prev => [...prev, notification]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    const handleTxFailed = ({ action, error }) => {
      const notification = {
        id: Date.now(),
        type: 'error',
        message: `❌ ${action} failed: ${error}`,
        timestamp: Date.now()
      };
      setNotifications(prev => [...prev, notification]);

      // Auto-remove after 8 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 8000);
    };

    socket.on('txPending', handleTxPending);
    socket.on('txConfirmed', handleTxConfirmed);
    socket.on('txFailed', handleTxFailed);

    return () => {
      socket.off('txPending', handleTxPending);
      socket.off('txConfirmed', handleTxConfirmed);
      socket.off('txFailed', handleTxFailed);
    };
  }, [socket]);

  if (notifications.length === 0) return null;

  return (
    <div className="transaction-notifications">
      {notifications.map(notification => (
        <div 
          key={notification.id} 
          className={`tx-notification tx-${notification.type}`}
        >
          <div className="tx-notification-content">
            <p>{notification.message}</p>
            {notification.txHash && (
              <a 
                href={`https://etherscan.io/tx/${notification.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-link"
              >
                View Transaction
              </a>
            )}
          </div>
          <button 
            className="tx-close" 
            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}