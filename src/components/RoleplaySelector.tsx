import { SCENARIOS, getChallengeOfTheDay } from "../scenarios";
import { Scenario, DailyChallenge } from "../types";
import { Sparkles, MessageSquare, Target } from "lucide-react";

interface RoleplaySelectorProps {
  activeScenarioId: string;
  onSelectScenario: (scenario: Scenario, isDailyChallenge?: boolean, challengeObj?: DailyChallenge) => void;
  completedChallengeToday: boolean;
}

export default function RoleplaySelector({
  activeScenarioId,
  onSelectScenario,
  completedChallengeToday,
}: RoleplaySelectorProps) {
  const dailyChallenge = getChallengeOfTheDay();

  const handleStartChallenge = () => {
    // Construct a temporary custom Scenario for the challenge
    const challengeScenario: Scenario = {
      id: `challenge_${dailyChallenge.id}`,
      title: `Daily Challenge: ${dailyChallenge.topic}`,
      category: "Academic",
      description: dailyChallenge.prompt,
      systemPrompt: `You are an encouraging English coach. Today's session is a focused Daily Challenge. The user's objective is: "${dailyChallenge.objective}". Encourage them to incorporate the target vocabulary: [${dailyChallenge.vocabularyGoal.join(", ")}]. Check if they use any of these words and politely acknowledge it with praise. Keep the tone warm, focused, and constructive.`,
      emoji: "🎯",
      starterMessage: `Welcome to today's Daily Challenge! 🌟\n\n**Topic:** ${dailyChallenge.topic}\n**Prompt:** ${dailyChallenge.prompt}\n\n**Your Learning Goals:**\n- *Objective:* ${dailyChallenge.objective}\n- *Target Vocabulary:* ${dailyChallenge.vocabularyGoal.map(v => `\`${v}\``).join(", ")}\n\nTo start, tell me your thoughts on the prompt!`,
    };

    onSelectScenario(challengeScenario, true, dailyChallenge);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Casual":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "Professional":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "Practical":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "Academic":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-white/5 text-slate-400 border-white/10";
    }
  };

  return (
    <div id="scenarios-section" className="max-w-7xl mx-auto px-4 pb-12 space-y-8">
      {/* Bento Row: Daily Challenge Box */}
      <div
        id="daily-challenge-bento"
        className="relative overflow-hidden bg-[#080b11] text-white rounded-3xl p-6 lg:p-8 shadow-[0_0_25px_rgba(37,99,235,0.15)] border border-white/10"
      >
        {/* Abstract background mesh */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-indigo-600/10 rounded-full blur-[80px] -ml-20 -mb-20 pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/15 backdrop-blur-md text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-blue-400 fill-blue-400" />
                <span>Goal of the Day</span>
              </span>
              {completedChallengeToday && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1">
                  ✓ Done for Today
                </span>
              )}
            </div>

            <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              {dailyChallenge.topic}
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              "{dailyChallenge.prompt}"
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2 text-xs text-slate-400">
              <div className="flex items-start gap-1.5">
                <Target className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Goal:</strong> {dailyChallenge.objective}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <MessageSquare className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Vocabulary Goals:</strong>{" "}
                  {dailyChallenge.vocabularyGoal.map((v) => `"${v}"`).join(", ")}
                </span>
              </div>
            </div>
          </div>

          <button
            id="start-daily-challenge-btn"
            onClick={handleStartChallenge}
            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-200 transform active:scale-95 shrink-0 self-start lg:self-center"
          >
            Start Daily Practice
          </button>
        </div>
      </div>

      {/* Roleplay Scenarios Title */}
      <div>
        <h3 className="text-xl font-semibold text-white tracking-tight">
          Choose a Conversation Partner
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Pick a customized scenario to practice specialized English vocabulary and context rules.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div id="scenarios-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SCENARIOS.map((sc) => {
          const isActive = activeScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              id={`scenario-card-${sc.id}`}
              onClick={() => onSelectScenario(sc)}
              className={`p-6 border rounded-2xl cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                isActive
                  ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                  : "border-white/5 bg-[#080b11]/85 hover:bg-white/5 hover:border-white/10"
              }`}
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-4xl select-none" role="img" aria-label={sc.title}>
                    {sc.emoji}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${getCategoryColor(
                      sc.category
                    )}`}
                  >
                    {sc.category}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold text-white">{sc.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {sc.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
                <span className={isActive ? "text-blue-400" : "text-slate-500 hover:text-slate-300"}>
                  {isActive ? "Currently practicing" : "Select Partner"}
                </span>
                <span className="text-slate-600 font-normal">→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
