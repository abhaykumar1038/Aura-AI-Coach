import { useState } from "react";
import { Award, BookOpen, AlertCircle, Trash2, CheckCircle, Copy, Check } from "lucide-react";
import { UserStats, LearnedItem } from "../types";
import StreakIndicator from "./StreakIndicator";

interface AnalyticsDashboardProps {
  stats: UserStats;
  learnedItems: LearnedItem[];
  onRemoveLearnedItem: (id: string) => void;
}

export default function AnalyticsDashboard({
  stats,
  learnedItems,
  onRemoveLearnedItem,
}: AnalyticsDashboardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Get score history for trend chart
  const getScoreHistory = () => {
    // Sort daily stats by date string
    const sortedDates = Object.keys(stats.dailyStats).sort();
    const history: { date: string; score: number }[] = [];

    sortedDates.forEach((date) => {
      const dayStat = stats.dailyStats[date];
      if (dayStat.scores && dayStat.scores.length > 0) {
        // Average score for the day
        const sum = dayStat.scores.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / dayStat.scores.length);
        // Format date to MM/DD
        const [_, m, d] = date.split("-");
        history.push({
          date: `${m}/${d}`,
          score: avg,
        });
      }
    });

    // Return last 10 points
    return history.slice(-10);
  };

  const scoreHistory = getScoreHistory();

  const handleCopyPhrase = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render a custom premium SVG chart for fluency trend
  const renderTrendChart = () => {
    if (scoreHistory.length === 0) {
      return (
        <div id="chart-empty" className="h-48 flex flex-col items-center justify-center text-center bg-white/5 rounded-xl p-4 border border-dashed border-white/10">
          <AlertCircle className="h-8 w-8 text-slate-500 mb-2" />
          <span className="text-sm font-semibold text-slate-300">No Fluency Data Yet</span>
          <span className="text-xs text-slate-500 max-w-xs mt-1">
            Complete several messages with the AI coach to plot your conversational improvements.
          </span>
        </div>
      );
    }

    const width = 500;
    const height = 200;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = 100;
    const minVal = 0;

    // Calculate coordinates
    const points = scoreHistory.map((point, index) => {
      const x = padding + (index / (scoreHistory.length - 1 || 1)) * chartWidth;
      const ratio = (point.score - minVal) / (maxVal - minVal || 1);
      const y = padding + (1 - ratio) * chartHeight;
      return { x, y, score: point.score, label: point.date };
    });

    // Generate SVG path string
    let pathD = "";
    if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        // Curve construction using cubic bezier points for smoothness
        const p0 = points[i - 1];
        const p1 = points[i];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }
    } else if (points.length === 1) {
      pathD = `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`;
    }

    return (
      <div id="fluency-trend-container" className="bg-[#080b11] border border-white/5 rounded-2xl p-5 shadow-xl">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-400" />
          <span>Fluency Score Trend</span>
        </h3>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none min-w-[320px]">
            {/* Grid Lines */}
            {[0, 25, 50, 75, 100].map((yVal) => {
              const ratio = (yVal - minVal) / (maxVal - minVal);
              const y = padding + (1 - ratio) * chartHeight;
              return (
                <g key={yVal}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={width - padding}
                    y2={y}
                    stroke="currentColor"
                    className="text-white/5"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-slate-500 font-semibold"
                  >
                    {yVal}
                  </text>
                </g>
              );
            })}

            {/* Area under curve */}
            {points.length > 1 && (
              <path
                d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`}
                fill="url(#chartGradient)"
                opacity="0.15"
              />
            )}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Smooth Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Data Dots & Labels */}
            {points.map((pt, i) => (
              <g key={i} className="group cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#2563eb"
                  stroke="#05070a"
                  strokeWidth="2"
                  className="shadow-sm hover:r-7 transition-all duration-150"
                />
                {/* Floating score label directly inside svg */}
                <text
                  x={pt.x}
                  y={pt.y - 10}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-blue-400"
                >
                  {pt.score}%
                </text>
                <text
                  x={pt.x}
                  y={height - padding + 15}
                  textAnchor="middle"
                  className="text-[10px] font-semibold fill-slate-500"
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div id="analytics-grid" className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4 pb-12">
      {/* Left Column: Progress and Habit Streaks */}
      <div className="lg:col-span-1 space-y-6">
        <StreakIndicator stats={stats} />

        {/* Global Competency Card */}
        <div id="competency-card" className="bg-[#080b11] border border-white/5 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Competency Statistics</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Average Fluency</span>
              <span className="text-3xl font-bold text-blue-400 block mt-1">
                {stats.averageFluency}%
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">All practice scores</span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mistakes Logged</span>
              <span className="text-3xl font-bold text-amber-500 block mt-1">
                {learnedItems.length}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Ready to review</span>
            </div>
          </div>

          <div className="mt-4 border-t border-white/5 pt-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Conversational Turn Count:</span>
              <span className="font-semibold text-white">{stats.totalMessages} messages</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Weekly Challenges:</span>
              <span className="font-semibold text-white">
                {Object.values(stats.dailyStats).filter(d => d.challengeCompleted).length} completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle/Right Columns: Fluency Chart & Active Mistakes Log */}
      <div className="lg:col-span-2 space-y-6">
        {/* SVG Chart */}
        {renderTrendChart()}

        {/* Mistakes Review deck */}
        <div id="learned-items-card" className="bg-[#080b11] border border-white/5 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">
                Review Center ({learnedItems.length} expressions)
              </h3>
            </div>
            {learnedItems.length > 0 && (
              <span className="text-[11px] text-slate-500 italic">Review cards to reinforce fluency</span>
            )}
          </div>

          {learnedItems.length === 0 ? (
            <div id="learned-empty" className="h-48 flex flex-col items-center justify-center text-center bg-white/5 rounded-xl p-6 border border-dashed border-white/10">
              <CheckCircle className="h-10 w-10 text-emerald-500 mb-2" />
              <span className="text-sm font-semibold text-slate-300">Perfect Streak! No Mistakes Logged</span>
              <span className="text-xs text-slate-500 max-w-sm mt-1">
                Your recent messages didn't have any major grammar mistakes, or you haven't started chatting yet. Keep it up!
              </span>
            </div>
          ) : (
            <div id="review-cards-list" className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
              {learnedItems.map((item) => (
                <div
                  key={item.id}
                  id={`learned-item-${item.id}`}
                  className="p-4 border border-white/10 rounded-xl bg-white/5 relative group hover:bg-white/10 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="text-xs text-slate-500 font-mono font-medium">{item.date}</div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        id={`learned-copy-${item.id}`}
                        onClick={() => handleCopyPhrase(item.id, item.corrected)}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
                        title="Copy corrected sentence"
                      >
                        {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        id={`learned-trash-${item.id}`}
                        onClick={() => onRemoveLearnedItem(item.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Mark as Mastered"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {/* Mistake */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Original draft</div>
                      <p className="text-sm text-slate-400 line-through decoration-rose-900 leading-snug">
                        "{item.original}"
                      </p>
                    </div>

                    {/* Correction */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Better expression</div>
                      <p className="text-sm font-semibold text-white leading-snug">
                        "{item.corrected}"
                      </p>
                    </div>

                    {/* Explanation */}
                    {item.explanation && (
                      <div className="mt-2 text-xs bg-blue-500/5 border-l-2 border-blue-500 p-2 text-slate-400">
                        {item.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
