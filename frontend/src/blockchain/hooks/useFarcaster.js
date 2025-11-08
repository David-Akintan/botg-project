import { useState, useEffect } from "react";

export const useFarcaster = () => {
  const [farcasterUser, setFarcasterUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check localStorage for existing session
    const savedUser = localStorage.getItem("farcaster_user");
    if (savedUser) {
      try {
        setFarcasterUser(JSON.parse(savedUser));
      } catch (err) {
        console.error("Failed to parse saved Farcaster user:", err);
        localStorage.removeItem("farcaster_user");
      }
    }

    // Check URL params (callback from Farcaster)
    const urlParams = new URLSearchParams(window.location.search);
    const fid = urlParams.get("fid");
    const username = urlParams.get("username");
    const pfp = urlParams.get("pfp_url");

    if (fid && username) {
      const user = {
        fid,
        username,
        displayName: decodeURIComponent(username),
        pfpUrl: pfp ? decodeURIComponent(pfp) : null,
        connectedAt: Date.now(),
      };

      setFarcasterUser(user);
      localStorage.setItem("farcaster_user", JSON.stringify(user));

      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const connectFarcaster = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Method 1: Warpcast Sign-In (Recommended)
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const authUrl = `https://warpcast.com/~/sign-in-with-farcaster?redirect_uri=${encodeURIComponent(
        redirectUri
      )}`;

      window.location.href = authUrl;
    } catch (err) {
      console.error("Farcaster connection error:", err);
      setError(err.message || "Failed to connect with Farcaster");
      setIsLoading(false);
    }
  };

  const disconnectFarcaster = () => {
    setFarcasterUser(null);
    localStorage.removeItem("farcaster_user");
    console.log("🟣 Farcaster disconnected");
  };

  return {
    farcasterUser,
    isLoading,
    error,
    isConnected: !!farcasterUser,
    connectFarcaster,
    disconnectFarcaster,
  };
};
