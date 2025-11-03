import React, { useEffect, useState } from 'react';
import '../../styles/components/blockchain/TransactionNotification.css';

export default function TransactionNotification({ socket }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const addNotification = (message, type) => {
      const id = Date.now();
      setNotifications(prev => [...prev, { id, message, type }]);

      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };

    socket.on('txPending', ({ action }) => {
      addNotification(`⏳ ${action}... (pending)`, 'pending');
    });

    socket.on('txConfirmed', ({ action }) => {
      addNotification(`✅ ${action} confirmed!`, 'success');
    });

    socket.on('txFailed', ({ action, error }) => {
      addNotification(`❌ ${action} failed: ${error}`, 'error');
    });

    return () => {
      socket.off('txPending');
      socket.off('txConfirmed');
      socket.off('txFailed');
    };
  }, [socket]);

  if (notifications.length === 0) return null;

  return (
    <div className="tx-notifications">
      {notifications.map(notif => (
        <div key={notif.id} className={`tx-notif tx-${notif.type}`}>
          {notif.message}
        </div>
      ))}
    </div>
  );
}