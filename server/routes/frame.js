app.get("/api/frame/leaderboard", async (req, res) => {
  // Get top 3 from blockchain
  const topPlayers = await getTopPlayers(3);

  // Generate image with leaderboard
  const imageUrl = await generateLeaderboardImage(topPlayers);

  res.send(generateFrameHTML(imageUrl));
});
