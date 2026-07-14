import { UserStats, DailyStat } from "../types";

export function getLocalDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function initializeUserStats(): UserStats {
  return {
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    totalMessages: 0,
    averageFluency: 0,
    dailyStats: {},
  };
}

export function updateStreakAndStats(
  currentStats: UserStats,
  scoreToAdd: number,
  isMistake: boolean,
  isChallengeCompleted: boolean
): UserStats {
  const updated = { ...currentStats };
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();

  // 1. Update streak
  if (updated.lastActiveDate === null) {
    updated.streak = 1;
    updated.bestStreak = 1;
  } else if (updated.lastActiveDate === todayStr) {
    // Already active today, streak doesn't change
  } else if (updated.lastActiveDate === yesterdayStr) {
    // Consecutive day!
    updated.streak += 1;
    updated.bestStreak = Math.max(updated.bestStreak, updated.streak);
  } else {
    // Broke the streak
    updated.streak = 1;
  }
  updated.lastActiveDate = todayStr;

  // 2. Update messages
  updated.totalMessages += 1;

  // 3. Update daily logs
  if (!updated.dailyStats[todayStr]) {
    updated.dailyStats[todayStr] = {
      date: todayStr,
      scores: [],
      messageCount: 0,
      mistakesCount: 0,
      challengeCompleted: false,
    };
  }

  const todayStats = updated.dailyStats[todayStr];
  todayStats.scores.push(scoreToAdd);
  todayStats.messageCount += 1;
  if (isMistake) {
    todayStats.mistakesCount += 1;
  }
  if (isChallengeCompleted) {
    todayStats.challengeCompleted = true;
  }

  // 4. Recompute global average fluency
  let allScores: number[] = [];
  Object.values(updated.dailyStats).forEach((dayStat: DailyStat) => {
    allScores = allScores.concat(dayStat.scores);
  });
  
  if (allScores.length > 0) {
    const sum = allScores.reduce((acc, s) => acc + s, 0);
    updated.averageFluency = Math.round(sum / allScores.length);
  }

  return updated;
}
