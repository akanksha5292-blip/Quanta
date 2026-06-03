export function scoreGuesstimate(user: number, correct: number): number {
  if (user <= 0 || correct <= 0) return 8;
  const ratio = Math.max(user, correct) / Math.min(user, correct);
  if (ratio <= 1.05) return 100;
  if (ratio <= 1.2) return 88;
  if (ratio <= 1.5) return 74;
  if (ratio <= 2.0) return 58;
  if (ratio <= 5.0) return 38;
  if (ratio <= 10.0) return 20;
  return 8;
}

export function scoreWarmup(correct: boolean): number {
  return correct ? 100 : 20;
}

export function scoreGk(correct: boolean, timeLeftMs: number): number {
  if (!correct) return 0;
  const timeLeft = Math.max(0, Math.min(30000, timeLeftMs));
  return Math.round(50 + (timeLeft / 30000) * 50);
}

export function scoreWordplay(correct: boolean, timeLeftMs: number): number {
  if (!correct) return 15;
  const timeLeft = Math.max(0, Math.min(120000, timeLeftMs));
  return Math.round(60 + (timeLeft / 120000) * 40);
}

export function scoreJudgment(userAnswer: string, expertAnswer: string): number {
  return userAnswer === expertAnswer ? 100 : 50;
}
