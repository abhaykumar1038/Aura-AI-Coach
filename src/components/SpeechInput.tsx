import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SpeechInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

export default function SpeechInput({ onResult, disabled = false }: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ type: string; title: string; desc: string } | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setErrorInfo(null);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        if (resultText) {
          onResult(resultText);
        }
        setIsListening(false);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        let title = "Speech Error";
        let desc = "There was an error accessing your microphone. Please try again.";
        const errorType = event.error;

        if (errorType === "network") {
          title = "Network Error";
          desc = "Chrome's Web Speech API requires contact with cloud recognition servers. In sandboxed previews, this can be blocked. Try opening the app in a new tab or typing your text.";
        } else if (errorType === "not-allowed") {
          title = "Permission Denied";
          desc = "Microphone access was denied. Click the camera/mic icon in the browser address bar to grant access, or open the app in a new tab.";
        } else if (errorType === "no-speech") {
          title = "No Speech Detected";
          desc = "We couldn't hear any audio. Speak clearly into your microphone.";
        } else if (errorType === "service-not-allowed") {
          title = "Service Restricted";
          desc = "Speech recognition is not allowed in this sandbox or on this browser. Try opening in a new tab.";
        }

        setErrorInfo({ type: errorType, title, desc });
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [onResult]);

  const toggleListening = () => {
    if (!isSupported || disabled) return;

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  if (!isSupported) {
    return (
      <button
        id="speech-mic-unsupported"
        disabled
        className="p-3 bg-white/5 text-slate-600 border border-white/10 rounded-xl cursor-not-allowed transition-all duration-200"
        title="Speech recognition is not supported in this browser. (Use Chrome/Safari/Edge)"
      >
        <MicOff className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div id="speech-mic-container" className="relative">
      <button
        id="speech-mic-toggle"
        type="button"
        onClick={toggleListening}
        disabled={disabled}
        className={`p-3 rounded-xl flex items-center justify-center transition-all duration-300 relative ${
          isListening
            ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-105"
            : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        title={isListening ? "Stop listening" : "Speak to practice pronunciation"}
      >
        {isListening ? (
          <motion.div
            id="mic-pulsing"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          >
            <Mic className="h-5 w-5" />
          </motion.div>
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </button>

      {/* Mic Status Toast Overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            id="mic-status-popup"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-16 right-0 bg-[#0f172a] text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap shadow-2xl z-50 border border-blue-500/30"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>Listening... Speak in English now</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic Error Toast Overlay */}
      <AnimatePresence>
        {errorInfo && (
          <motion.div
            id="speech-error-popup"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-16 right-0 bg-[#0f172a]/95 backdrop-blur-xl border border-red-500/30 rounded-xl p-4 shadow-2xl z-50 w-72 text-left"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                {errorInfo.title}
              </span>
              <button
                id="close-speech-error"
                type="button"
                onClick={() => setErrorInfo(null)}
                className="text-slate-500 hover:text-slate-300 text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              {errorInfo.desc}
            </p>
            {errorInfo.type === "network" && (
              <button
                id="speech-open-new-tab"
                type="button"
                onClick={() => window.open(window.location.href, "_blank")}
                className="w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] rounded-lg shadow-lg shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
              >
                Open in New Tab (Resolves Sandbox Block)
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
