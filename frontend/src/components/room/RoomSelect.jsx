import React, { useState, useEffect } from "react";
import "../../styles/components/room/RoomSelect.css";

export default function RoomSelect({
  onJoinRoom,
  simulateMode,
  setSimulateMode,
  rooms,
  socket,
  hostRoomInfo,
  onHostRejoin,
}) {
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("join");
  const [localRooms, setLocalRooms] = useState(rooms || []);

  useEffect(() => {
    setLocalRooms(rooms);
  }, [rooms]);

  const handleJoin = () => {
    if (!roomCode.trim()) {
      alert("Please enter a room code!");
      return;
    }

    const info = { roomCode: roomCode.trim(), mode: "join" };
    console.log("Joining room:", info);
    socket.emit("joinRoom", info);
  };

  const handleCreateRoom = () => {
    const generatedCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
    const info = { roomCode: generatedCode, mode: "create" };
    console.log("Creating room:", info);
    socket.emit("joinRoom", info);
  };

  const handleJoinFromList = (roomId) => {
    const info = { roomCode: roomId, mode: "join" };
    console.log("Joining room from list:", info);
    socket.emit("joinRoom", info);
  };

  const handleHostRejoin = () => {
    if (!hostRoomInfo) return;
    console.log("🔄 Rejoining host room:", hostRoomInfo.roomCode);
    onHostRejoin(hostRoomInfo.roomCode);
  };

  const hostRoomExists =
    hostRoomInfo &&
    localRooms.some((room) => room.id === hostRoomInfo.roomCode);

  return (
    <div className="room-select-container">
      {/* Back Button */}
      {/* <button className="back-to-welcome-btn" onClick={() => window.location.reload()}>
        ← Back to Welcome
      </button> */}

      <div className="room-select-content">
        <h2>🎮 Join or Create Room</h2>

        {/* Host Rejoin Section */}
        {hostRoomExists && (
          <div className="host-rejoin-section">
            <div className="rejoin-banner">
              <span className="rejoin-icon">👑</span>
              <div className="rejoin-content">
                <h3>You are the host of a room!</h3>
                <p>
                  Room Code: <strong>{hostRoomInfo.roomCode}</strong>
                </p>
              </div>
              <button className="rejoin-btn" onClick={handleHostRejoin}>
                🔄 Rejoin Your Room
              </button>
            </div>
          </div>
        )}

        {hostRoomInfo && !hostRoomExists && (
          <div className="room-expired-notice">
            <p>
              ⚠️ Your previous room ({hostRoomInfo.roomCode}) no longer exists.
            </p>
          </div>
        )}

        {/* Room Toggle */}
        <div className="room-toggle">
          <button
            className={mode === "join" ? "active" : ""}
            onClick={() => setMode("join")}
          >
            Join Room
          </button>
          <button
            className={mode === "create" ? "active" : ""}
            onClick={() => setMode("create")}
          >
            Create Room
          </button>
        </div>

        {/* Simulate Toggle */}
        <div className="simulate-toggle">
          <label>
            <input
              type="checkbox"
              checked={simulateMode}
              onChange={(e) => setSimulateMode(e.target.checked)}
            />
            Enable Simulation Mode (Bot Players)
          </label>
        </div>

        {/* Join Room */}
        {mode === "join" && (
          <div className="input-section">
            <label>Enter Room Code:</label>
            <input
              type="text"
              placeholder="e.g., X9AB2"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <button className="action-btn" onClick={handleJoin}>
              Join Room
            </button>
          </div>
        )}

        {/* Create Room */}
        {mode === "create" && (
          <div className="create-room-section">
            <p>Click below to generate a new room.</p>
            <button className="action-btn" onClick={handleCreateRoom}>
              Create Room
            </button>
          </div>
        )}

        {/* Available Rooms */}
        <div className="available-rooms">
          <h3>Available Rooms</h3>
          {localRooms.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--gray-500)" }}>
              No available rooms.
            </p>
          ) : (
            <ul>
              {localRooms.map((room) => (
                <li key={room.id}>
                  <div className="room-info">
                    <strong>{room.id}</strong>
                    {room.id === hostRoomInfo?.roomCode && (
                      <span className="your-room-tag">👑 Your Room</span>
                    )}
                  </div>
                  <span className="room-players">
                    {room.playerCount || 0}/{room.maxPlayers || 4} players
                  </span>
                  <button
                    onClick={() => handleJoinFromList(room.id)}
                    disabled={room.playerCount >= room.maxPlayers}
                  >
                    {room.playerCount >= room.maxPlayers ? "Full" : "Join"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
