import { Flame, Calendar, Trophy } from "lucide-react";
import { UserStats } from "../types";
import { getLocalDateString } from "../utils/streak";

interface StreakIndicatorProps {
  stats: UserStats;
}

export default function StreakIndicator({ stats }: StreakIndicatorProps) {
  const { streak, bestStreak, dailyStats } = stats;

  // Generate the last 7 days of the week to display as a check-grid
  const getPastSevenDays = () => {
    const days = [];
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      days.push({
        name: weekdays[d.getDay()],
        dateStr,
        isToday: dateStr === getLocalDateString(),
        hasPracticed: !!dailyStats[dateStr] && dailyStats[dateStr].messageCount > 0,
      });
    }
    return days;
  };

  const pastSevenDays = getPastSevenSevenDaysSafe();

  function getPastSevenSevenDaysSafe() {
    try {
      return getPastSevenDays();
    } catch (e) {
      return [];
    }
  }

  return (
    <div id="streak-card" className="bg-[#080b11] border border-white/5 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-white">Daily Habit</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold">
          <Trophy className="h-3.5 w-3.5" />
          <span>Record: {bestStreak} Days</span>
        </div>
      </div>

      <div className="flex items-center gap-5 bg-white/5 border border-white/10 p-4 rounded-xl mb-4">
        <div className="relative flex items-center justify-center">
          <Flame
            className={`h-12 w-12 filter drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] ${
              streak > 0 
                ? "text-orange-500 fill-orange-500 animate-pulse" 
                : "text-slate-700"
            }`}
          />
          {streak > 0 && (
            <span className="absolute text-white font-black text-sm select-none mt-1">
              {streak}
            </span>
          )}
        </div>
        <div>
          <h4 className="font-semibold text-white">
            {streak > 0 ? `${streak} Day Streak!` : "Light the Flame!"}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {streak > 0 
              ? "Great job! Keep practicing tomorrow to maintain your flow." 
              : "Complete at least one message today to start your habit streak."}
          </p>
        </div>
      </div>

      {/* Week Grid */}
      <div>
        <div className="text-xs font-medium text-slate-500 mb-2">Practice Calendar</div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {pastSevenDays.map((day) => (
            <div 
              key={day.dateStr} 
              id={`cal-day-${day.dateStr}`}
              className={`p-1.5 rounded-lg flex flex-col items-center border ${
                day.isToday 
                  ? "border-blue-500/30 bg-blue-500/10" 
                  : "border-transparent"
              }`}
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase">{day.name}</span>
              <div 
                id={`cal-indicator-${day.dateStr}`}
                className={`mt-2 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  day.hasPracticed
                    ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                    : day.isToday
                      ? "bg-slate-800 text-slate-300 border border-dashed border-slate-700"
                      : "bg-white/5 text-slate-500"
                }`}
              >
                {day.hasPracticed ? "✓" : new Date(day.dateStr).getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
