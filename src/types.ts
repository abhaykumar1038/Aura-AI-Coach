export interface Correction {
  error: string;
  correction: string;
  explanation: string;
}

export interface FluencyScores {
  grammar: number;
  vocabulary: number;
  naturalness: number;
  overall: number;
}

export interface MessageAnalysis {
  original: string;
  isCorrect: boolean;
  corrected: string;
  correctionsList: Correction[];
  suggestions: string[];
  scores: FluencyScores;
  coachTip: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  analysis?: MessageAnalysis; // Present for user messages evaluated by Gemini
}

export interface Scenario {
  id: string;
  title: string;
  category: "Casual" | "Professional" | "Practical" | "Academic";
  description: string;
  systemPrompt: string;
  emoji: string;
  starterMessage: string;
}

export interface DailyChallenge {
  id: string;
  topic: string;
  prompt: string;
  objective: string;
  vocabularyGoal: string[];
}

export interface ConversationSession {
  id: string;
  scenarioId: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  scores: number[]; // All overall scores from today
  messageCount: number;
  mistakesCount: number;
  challengeCompleted: boolean;
}

export interface UserStats {
  streak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  totalMessages: number;
  averageFluency: number;
  dailyStats: Record<string, DailyStat>; // Keyed by YYYY-MM-DD
}

export interface LearnedItem {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  date: string;
  contextMessage: string;
}
