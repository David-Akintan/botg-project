// Mock of the GenLayer Intelligent Contract interaction
// In production: replace with actual GenLayer SDK calls

let answers = [];

export async function submitAnswer(player, text) {
  // send to intelligent contract endpoint
  answers.push({ name: player, answer: text, points: Math.floor(Math.random() * 100) });
  return true;
}

export async function getWinner() {
  // mock consensus resolution + XP
  return answers.sort((a, b) => b.points - a.points);
}
