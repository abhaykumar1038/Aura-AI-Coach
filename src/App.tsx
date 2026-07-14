import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Sparkles,
  Award,
  BookOpen,
  Send,
  Loader2,
  RefreshCw,
  User,
  ArrowRight,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  BrainCircuit,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Message, Scenario, UserStats, LearnedItem, MessageAnalysis, DailyChallenge } from "./types";
import { SCENARIOS, getChallengeOfTheDay } from "./scenarios";
import { initializeUserStats, updateStreakAndStats, getLocalDateString } from "./utils/streak";
import VoiceButton from "./components/VoiceButton";
import SpeechInput from "./components/SpeechInput";
import RoleplaySelector from "./components/RoleplaySelector";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"chat" | "partners" | "hub">("chat");

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario>(SCENARIOS[0]);
  const [stats, setStats] = useState<UserStats>(initializeUserStats());
  const [learnedItems, setLearnedItems] = useState<LearnedItem[]>([]);
  const [isDailyChallengeActive, setIsDailyChallengeActive] = useState(false);
  const [activeChallenge, setActiveChallenge] = useState<DailyChallenge | null>(null);

  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const cachedStats = localStorage.getItem("fluent_user_stats");
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch (e) {
        console.error("Failed to parse cached stats");
      }
    }

    const cachedItems = localStorage.getItem("fluent_learned_items");
    if (cachedItems) {
      try {
        setLearnedItems(JSON.parse(cachedItems));
      } catch (e) {
        console.error("Failed to parse cached learned items");
      }
    }

    const cachedScenario = localStorage.getItem("fluent_active_scenario");
    const cachedMessages = localStorage.getItem("fluent_chat_messages");

    if (cachedScenario && cachedMessages) {
      try {
        setActiveScenario(JSON.parse(cachedScenario));
        setMessages(JSON.parse(cachedMessages));
      } catch (e) {
        // Fallback
        resetConversation(SCENARIOS[0]);
      }
    } else {
      resetConversation(SCENARIOS[0]);
    }
  }, []);

  // Save state to local storage when changed
  useEffect(() => {
    if (stats.lastActiveDate !== null) {
      localStorage.setItem("fluent_user_stats", JSON.stringify(stats));
    }
  }, [stats]);

  useEffect(() => {
    localStorage.setItem("fluent_learned_items", JSON.stringify(learnedItems));
  }, [learnedItems]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("fluent_chat_messages", JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem("fluent_active_scenario", JSON.stringify(activeScenario));
  }, [activeScenario]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const resetConversation = (scenario: Scenario) => {
    const starterMessage: Message = {
      id: "starter",
      role: "assistant",
      content: scenario.starterMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages([starterMessage]);
    setSelectedMessageId(null);
    setInputText("");
    setIsDailyChallengeActive(false);
    setActiveChallenge(null);
  };

  const handleSelectScenario = (
    scenario: Scenario,
    isChallenge: boolean = false,
    challengeObj?: DailyChallenge
  ) => {
    setActiveScenario(scenario);
    resetConversation(scenario);
    if (isChallenge && challengeObj) {
      setIsDailyChallengeActive(true);
      setActiveChallenge(challengeObj);
    }
    setActiveTab("chat");
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent || isLoading) return;

    setInputText("");

    // Create unique IDs
    const userMsgId = `user_${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      role: "user",
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // API call to Express /api/chat
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          scenario: activeScenario.title,
          scenarioPrompt: activeScenario.systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to receive feedback from English practice server.");
      }

      const data = await response.json();

      // Destructure Gemini structured response
      const coachReplyText = data.reply;
      const feedbackAnalysis: MessageAnalysis = data.analysis;

      // Update User Messages with associated analysis
      const analyzedMessages = updatedMessages.map((m) => {
        if (m.id === userMsgId) {
          return { ...m, analysis: feedbackAnalysis };
        }
        return m;
      });

      // Append Coach Reply Message
      const coachMsgId = `coach_${Date.now()}`;
      const newCoachMessage: Message = {
        id: coachMsgId,
        role: "assistant",
        content: coachReplyText,
        timestamp: new Date().toISOString(),
      };

      setMessages([...analyzedMessages, newCoachMessage]);
      setSelectedMessageId(userMsgId); // Auto-expand analysis for their newly sent message

      // Update overall metrics & streaks
      const overallFluencyScore = feedbackAnalysis.scores.overall;
      const hadMistakes = !feedbackAnalysis.isCorrect;

      // Verify if target vocabulary was met for daily challenge
      let challengeMetThisTurn = false;
      if (isDailyChallengeActive && activeChallenge) {
        const wordsUsed = activeChallenge.vocabularyGoal.filter((word) =>
          messageContent.toLowerCase().includes(word.toLowerCase())
        );
        if (wordsUsed.length > 0) {
          challengeMetThisTurn = true;
        }
      }

      const updatedStats = updateStreakAndStats(
        stats,
        overallFluencyScore,
        hadMistakes,
        challengeMetThisTurn
      );
      setStats(updatedStats);

      // Auto-populate corrected mistakes inside Learned deck
      if (hadMistakes) {
        const newLearnedItems: LearnedItem[] = feedbackAnalysis.correctionsList.map((cor, idx) => ({
          id: `${userMsgId}_err_${idx}`,
          original: cor.error,
          corrected: cor.correction,
          explanation: cor.explanation,
          date: getLocalDateString(),
          contextMessage: messageContent,
        }));

        // Prevent exact duplicates
        setLearnedItems((prev) => {
          const filtered = prev.filter(
            (p) => !newLearnedItems.some((n) => n.original.toLowerCase() === p.original.toLowerCase())
          );
          return [...newLearnedItems, ...filtered];
        });
      }
    } catch (error: any) {
      console.error(error);
      // Fallback response on error
      const errorMsgId = `coach_err_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: errorMsgId,
          role: "assistant",
          content: "Sorry, I encountered a brief connection error analyzing your text. Let's try saying that again!",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeechInputResult = (text: string) => {
    setInputText(text);
  };

  const handleRemoveLearnedItem = (id: string) => {
    setLearnedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCopyPhrase = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Find currently selected analysis
  const selectedMessage = messages.find((m) => m.id === selectedMessageId);
  const selectedAnalysis = selectedMessage?.analysis;

  const todayStr = getLocalDateString();
  const completedChallengeToday = !!stats.dailyStats[todayStr]?.challengeCompleted;

  return (
    <div id="app-root" className="min-h-screen bg-[#05070a] font-sans flex flex-col text-slate-300 selection:bg-blue-500/20 relative overflow-hidden transition-colors duration-300">
      {/* Background Glow Elements */}
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      {/* Premium Header */}
      <header id="main-header" className="sticky top-0 bg-[#05070a]/80 backdrop-blur-md border-b border-white/5 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <BrainCircuit className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white leading-tight tracking-tight flex items-center gap-1.5 text-sm sm:text-base">
                Aura AI Coach
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]" />
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500">Immersive conversational partner</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav id="nav-tabs" className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              id="tab-chat"
              onClick={() => setActiveTab("chat")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "chat"
                  ? "bg-blue-600 shadow-lg text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              💬 Practice
            </button>
            <button
              id="tab-partners"
              onClick={() => setActiveTab("partners")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "partners"
                  ? "bg-blue-600 shadow-lg text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🎯 Scenarios
            </button>
            <button
              id="tab-hub"
              onClick={() => setActiveTab("hub")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === "hub"
                  ? "bg-blue-600 shadow-lg text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📊 Fluency Hub
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Areas */}
      <main className="flex-1 flex flex-col relative z-10">
        {activeTab === "partners" && (
          <div className="pt-8 animate-fade-in">
            <RoleplaySelector
              activeScenarioId={activeScenario.id}
              onSelectScenario={handleSelectScenario}
              completedChallengeToday={completedChallengeToday}
            />
          </div>
        )}

        {activeTab === "hub" && (
          <div className="pt-8 animate-fade-in">
            <AnalyticsDashboard
              stats={stats}
              learnedItems={learnedItems}
              onRemoveLearnedItem={handleRemoveLearnedItem}
            />
          </div>
        )}

        {activeTab === "chat" && (
          <div id="chat-layout" className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 gap-6 items-stretch">
            {/* Conversation Stream Column */}
            <div id="chat-feed-column" className="flex-1 bg-[#080b11]/80 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col h-[calc(100vh-12rem)] shadow-2xl min-h-[450px] relative z-10">
              {/* Partner Banner */}
              <div id="partner-banner" className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none">{activeScenario.emoji}</span>
                  <div>
                    <h3 className="font-semibold text-sm text-white leading-tight">
                      {activeScenario.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 leading-none mt-1">
                      {isDailyChallengeActive ? "🎯 Active Challenge Session" : `Category: ${activeScenario.category}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="reset-chat-btn"
                    onClick={() => resetConversation(activeScenario)}
                    className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                    title="Restart current conversation"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline font-semibold">Restart</span>
                  </button>
                  <button
                    id="switch-partner-btn"
                    onClick={() => setActiveTab("partners")}
                    className="p-1.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <span>Change Scenario</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Scrollable Feed */}
              <div id="message-feed" className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => {
                  const isCoach = m.role === "assistant";
                  const hasFeedback = m.analysis && !m.analysis.isCorrect;
                  const isSelected = selectedMessageId === m.id;

                  return (
                    <div
                      key={m.id}
                      id={`msg-wrapper-${m.id}`}
                      className={`flex gap-3 max-w-full sm:max-w-3xl ${
                        isCoach ? "self-start" : "ml-auto self-end flex-row-reverse"
                      }`}
                    >
                      {/* Avatar */}
                      <div
                        id={`msg-avatar-${m.id}`}
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border ${
                          isCoach
                            ? "bg-blue-600/10 text-blue-400 border-blue-500/20"
                            : "bg-white/10 text-slate-300 border-white/15"
                        }`}
                      >
                        {isCoach ? activeScenario.emoji : <User className="h-4 w-4" />}
                      </div>

                      {/* Bubble */}
                      <div className="space-y-1.5 max-w-full">
                        <div
                          id={`msg-bubble-${m.id}`}
                          className={`p-3.5 rounded-2xl text-xs sm:text-sm shadow-md relative leading-relaxed border ${
                            isCoach
                              ? "bg-white/5 border-white/10 text-slate-200 rounded-tl-none"
                              : "bg-blue-600/20 border-blue-500/30 text-blue-50 rounded-tr-none hover:bg-blue-600/30 cursor-pointer transition-colors"
                          }`}
                          onClick={() => {
                            if (!isCoach && m.analysis) {
                              setSelectedMessageId(m.id);
                            }
                          }}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>

                          {/* Evaluated Badge overlay */}
                          {!isCoach && m.analysis && (
                            <span className="absolute -bottom-2 -left-2 bg-emerald-500/20 text-emerald-400 font-bold text-[9px] px-1.5 py-0.5 rounded-full border border-emerald-500/30 shadow-sm flex items-center gap-0.5 select-none">
                              {m.analysis.isCorrect ? "Perfect" : `${m.analysis.scores.overall}% Score`}
                            </span>
                          )}
                        </div>

                        {/* Interactive utilities */}
                        <div
                          id={`msg-utils-${m.id}`}
                          className={`flex items-center gap-2 px-1 ${isCoach ? "justify-start" : "justify-end"}`}
                        >
                          {isCoach ? (
                            <VoiceButton id={m.id} text={m.content} />
                          ) : (
                            m.analysis && (
                              <button
                                id={`msg-eval-btn-${m.id}`}
                                onClick={() => setSelectedMessageId(m.id)}
                                className={`text-[10px] font-bold flex items-center gap-1 hover:underline ${
                                  isSelected 
                                    ? "text-blue-400" 
                                    : "text-slate-500 hover:text-slate-300"
                                }`}
                              >
                                <BrainCircuit className="h-3 w-3" />
                                <span>{isSelected ? "Feedback active" : "View corrections"}</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div id="coach-typing-loader" className="flex gap-3 max-w-sm self-start">
                    <div className="h-8 w-8 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0 text-xs">
                      {activeScenario.emoji}
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-2 shadow-md">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-xs text-slate-400 font-medium italic">Analyzing fluency...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Area */}
              <div id="chat-input-container" className="p-4 border-t border-white/5 bg-[#05070a]/90 rounded-b-2xl">
                <form
                  id="chat-input-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-3 bg-white/5 p-1.5 rounded-xl border border-white/10 focus-within:border-blue-500/30 transition-all"
                >
                  <input
                    id="chat-text-input"
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type your response..."
                    className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm focus:outline-none placeholder:text-slate-500 text-white"
                    disabled={isLoading}
                  />

                  {/* Mic Dictation */}
                  <SpeechInput onResult={handleSpeechInputResult} disabled={isLoading} />

                  <button
                    id="chat-send-btn"
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className={`p-3 rounded-xl flex items-center justify-center text-white transition-all duration-200 ${
                      inputText.trim() && !isLoading
                        ? "bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 hover:scale-105 transition-transform cursor-pointer"
                        : "bg-white/5 text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Slide-out / Right Column grammar analysis panel */}
            <AnimatePresence>
              {selectedMessage && selectedAnalysis && (
                <motion.div
                  id="feedback-panel-column"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="w-full lg:w-96 bg-[#080b11]/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-5 flex flex-col h-[calc(100vh-12rem)] shadow-2xl overflow-y-auto relative z-20"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-blue-400" />
                      <h3 className="font-semibold text-sm text-white">Fluency Analysis</h3>
                    </div>
                    <button
                      id="close-feedback-btn"
                      onClick={() => setSelectedMessageId(null)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-300"
                    >
                      Close ✕
                    </button>
                  </div>

                  {/* Circular scores display */}
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center relative overflow-hidden">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Fluency Score</span>
                      <div className="text-3xl font-bold text-blue-400">
                        {selectedAnalysis.scores.overall}%
                      </div>
                      <div className="mt-1 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${selectedAnalysis.scores.overall}%` }} />
                      </div>
                    </div>

                    <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Assessment</span>
                      <div className={`text-xs font-bold block leading-none py-1.5 px-2 rounded-full border text-center ${
                        selectedAnalysis.isCorrect
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        {selectedAnalysis.isCorrect ? "Perfect English" : "Has Corrections"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 flex-1">
                    {/* Scores Breakdown */}
                    <div className="space-y-2 border-b border-white/5 pb-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fluency Indicators</h4>
                      <div className="space-y-2 text-xs">
                        <div>
                          <div className="flex justify-between font-semibold mb-0.5">
                            <span className="text-slate-400">Grammar & Spelling</span>
                            <span className="text-white">{selectedAnalysis.scores.grammar}/100</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${selectedAnalysis.scores.grammar}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-semibold mb-0.5">
                            <span className="text-slate-400">Vocabulary richness</span>
                            <span className="text-white">{selectedAnalysis.scores.vocabulary}/100</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${selectedAnalysis.scores.vocabulary}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between font-semibold mb-0.5">
                            <span className="text-slate-400">Naturalness / Flow</span>
                            <span className="text-white">{selectedAnalysis.scores.naturalness}/100</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${selectedAnalysis.scores.naturalness}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Original draft and corrected */}
                    {!selectedAnalysis.isCorrect && (
                      <div className="space-y-2 border-b border-white/5 pb-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Grammar Overhaul</h4>
                        <div className="space-y-2.5">
                          <div className="bg-rose-500/5 border-l-2 border-rose-500 p-2.5 rounded-r-xl">
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide block">Your Draft</span>
                            <p className="text-xs text-slate-400 leading-snug mt-1">"{selectedAnalysis.original}"</p>
                          </div>
                          <div className="bg-emerald-500/5 border-l-2 border-emerald-500 p-2.5 rounded-r-xl">
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide block">Corrected Draft</span>
                            <p className="text-xs font-semibold text-white leading-snug mt-1">"{selectedAnalysis.corrected}"</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Corrections List details */}
                    {!selectedAnalysis.isCorrect && selectedAnalysis.correctionsList.length > 0 && (
                      <div className="space-y-2 border-b border-white/5 pb-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mistakes Corrected</h4>
                        <div className="space-y-3">
                          {selectedAnalysis.correctionsList.map((cor, idx) => (
                            <div key={idx} id={`correction-item-${idx}`} className="p-3 border border-white/10 bg-white/5 rounded-xl space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="bg-rose-500/10 text-rose-400 px-1.5 py-0.5 rounded line-through font-mono">
                                  {cor.error}
                                </span>
                                <span className="text-slate-600">→</span>
                                <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-semibold font-mono">
                                  {cor.correction}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {cor.explanation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggestions list */}
                    {selectedAnalysis.suggestions && selectedAnalysis.suggestions.length > 0 && (
                      <div className="space-y-2 border-b border-white/5 pb-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Better Phrasing Alternatives</h4>
                        <div className="space-y-2">
                          {selectedAnalysis.suggestions.map((sug, idx) => (
                            <div
                              key={idx}
                              id={`suggestion-item-${idx}`}
                              className="p-2.5 border border-white/10 rounded-xl bg-white/5 flex items-start justify-between gap-3 group/sug"
                            >
                              <p className="text-xs text-slate-300 leading-snug">{sug}</p>
                              <button
                                id={`sug-copy-${idx}`}
                                onClick={() => handleCopyPhrase(`sug_${idx}`, sug)}
                                className="p-1 text-slate-500 hover:text-blue-400 hover:bg-white/5 rounded-md transition-colors shrink-0"
                                title="Copy alternative"
                              >
                                {copiedId === `sug_${idx}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 opacity-0 group-hover/sug:opacity-100 transition-opacity" />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Coach Grammar Tip */}
                    {selectedAnalysis.coachTip && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Coach's Grammar Tip</h4>
                        <div className="bg-blue-500/5 border-l-2 border-blue-500 p-3 rounded-r-xl text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                          {selectedAnalysis.coachTip}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
