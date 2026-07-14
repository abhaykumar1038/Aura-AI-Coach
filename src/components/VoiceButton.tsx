import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Loader2, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceButtonProps {
  id: string;
  text: string;
}

export default function VoiceButton({ id, text }: VoiceButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceProvider, setVoiceProvider] = useState<"gemini" | "browser">("gemini");
  const [selectedVoice, setSelectedVoice] = useState<"Zephyr" | "Kore" | "Puck" | "Charon">("Zephyr");
  const [showSettings, setShowSettings] = useState(false);

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Stop any active audio when unmounted or changed
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const stopAudio = () => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
      } catch (e) {
        // Already stopped
      }
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    setIsLoading(true);

    if (voiceProvider === "gemini") {
      try {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            voice: selectedVoice,
          }),
        });

        if (!response.ok) {
          throw new Error("Gemini TTS response not ok");
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        // Decode 16-bit PCM base64 audio
        const binary = atob(data.audio);
        const len = binary.length;
        const buffer = new ArrayBuffer(len);
        const view = new DataView(buffer);
        for (let i = 0; i < len; i++) {
          view.setUint8(i, binary.charCodeAt(i));
        }

        const numSamples = len / 2;
        const f32Array = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          const pcm16 = view.getInt16(i * 2, true); // little-endian
          f32Array[i] = pcm16 / 32768.0;
        }

        const sampleRate = 24000;
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
        audioCtxRef.current = audioCtx;

        const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
        audioBuffer.copyToChannel(f32Array, 0);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        audioSourceRef.current = source;

        source.onended = () => {
          setIsPlaying(false);
        };

        source.start(0);
        setIsPlaying(true);
        setIsLoading(false);
      } catch (error) {
        console.warn("Gemini TTS failed, falling back to Browser SpeechSynthesis:", error);
        // Fallback to browser synthesis
        playBrowserSpeech();
      }
    } else {
      playBrowserSpeech();
    }
  };

  const playBrowserSpeech = () => {
    if (!window.speechSynthesis) {
      setIsLoading(false);
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    stopAudio();
    setIsLoading(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.0;

    // Try to find a nice English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith("en-") && v.name.includes("Google")) || 
                         voices.find(v => v.lang.startsWith("en-")) || 
                         voices[0];
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      setIsPlaying(false);
      setIsLoading(false);
    };

    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div id={`voice-container-${id}`} className="flex items-center gap-2 relative">
      <button
        id={`voice-btn-${id}`}
        onClick={handlePlay}
        disabled={isLoading}
        className={`p-1.5 rounded-full transition-all duration-200 ${
          isPlaying 
            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400" 
            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        } focus:outline-none`}
        title={isPlaying ? "Stop listening" : "Listen to pronunciation"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : isPlaying ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>

      {/* Miniature audio waveform representation */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            id={`waveform-${id}`}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "32px" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-0.5 h-3 overflow-hidden"
          >
            {[1, 2, 3, 4].map((bar) => (
              <motion.span
                key={bar}
                animate={{
                  height: ["20%", "100%", "20%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.5 + bar * 0.15,
                  ease: "easeInOut",
                }}
                className="w-0.5 bg-emerald-500 rounded-full h-full"
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        id={`voice-settings-btn-${id}`}
        onClick={() => setShowSettings(!showSettings)}
        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus:outline-none"
        title="Voice settings"
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {/* Mini-settings popover */}
      {showSettings && (
        <div id={`voice-settings-popover-${id}`} className="absolute bottom-8 left-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3 rounded-xl shadow-lg z-50 w-48 text-xs">
          <div className="mb-2.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Voice Source</span>
            <div className="grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-800/50 p-0.5 rounded-lg">
              <button
                id={`prov-gemini-${id}`}
                onClick={() => setVoiceProvider("gemini")}
                className={`py-1 rounded-md text-center font-medium ${
                  voiceProvider === "gemini" 
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Gemini AI
              </button>
              <button
                id={`prov-browser-${id}`}
                onClick={() => setVoiceProvider("browser")}
                className={`py-1 rounded-md text-center font-medium ${
                  voiceProvider === "browser" 
                    ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                Browser
              </button>
            </div>
          </div>

          {voiceProvider === "gemini" && (
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Gemini Speaker</span>
              <div className="grid grid-cols-2 gap-1">
                {(["Zephyr", "Kore", "Puck", "Charon"] as const).map((voiceName) => (
                  <button
                    key={voiceName}
                    id={`voice-${voiceName}-${id}`}
                    onClick={() => setSelectedVoice(voiceName)}
                    className={`py-1 px-1.5 border rounded-lg transition-colors ${
                      selectedVoice === voiceName
                        ? "border-indigo-500 bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 font-medium"
                        : "border-slate-100 hover:border-slate-200 text-slate-600 dark:border-slate-800 dark:hover:border-slate-700"
                    }`}
                  >
                    {voiceName}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <button
            id={`voice-settings-close-${id}`}
            onClick={() => setShowSettings(false)}
            className="mt-2 w-full text-center py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-lg"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
