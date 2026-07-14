import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please add it to your secrets in Settings > Secrets.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API endpoints
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "English practice server is healthy!" });
  });

  // Chat and Conversational Feedback Endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, scenario, scenarioPrompt } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Invalid or missing 'messages' array in request body." });
        return;
      }

      const client = getGeminiClient();

      // Transform history to Gemini SDK format
      // Gemini expects format: { role: 'user' | 'model', parts: [{ text: string }] }
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const systemInstruction = `You are an encouraging, expert, and patient English Conversational Coach.
Your mission is to help a non-native English learner practice and improve their English fluency, vocabulary, and grammar.

The user is participating in a roleplay or discussion scenario: "${scenario}".
Scenario details and context: "${scenarioPrompt}".

Based on the user's latest message, you must construct a JSON response with two parts:
1. "reply": A natural, conversational, and context-appropriate response (in character for the scenario) that keeps the dialogue going and ends with an engaging question or follow-up prompt to keep them speaking.
2. "analysis": A comprehensive, constructive, and kind assessment of their very last message.

Guidelines for "analysis":
- Verify the grammar, spelling, preposition use, and punctuation. If correct, set "isCorrect" to true and let "corrected" be the user's original text.
- If there are mistakes, set "isCorrect" to false and provide the fully "corrected" sentence.
- For each specific mistake, add an item in "correctionsList" explaining the "error", the "correction", and the grammatical "explanation" in a friendly, supportive tone.
- In "suggestions", suggest 2-3 alternative ways to express the same thought using more natural, advanced, or idiomatic English to help build their vocabulary.
- In "scores", provide an encouraging but honest score (0-100) for "grammar", "vocabulary", "naturalness", and an "overall" score. (A message with minor typos should get ~85-90 overall; a very basic but grammatically perfect message should get high grammar but ~75-80 vocabulary; a rich, expressive message gets 90+).
- In "coachTip", write a short (1-2 sentences) customized tip on a relevant language topic, such as a helpful grammar rule, a note on common phrasal verbs, or a pronunciation tip for a difficult word they used.

You MUST respond strictly in the requested JSON format according to the schema.`;

      // Define the response schema to guarantee high quality structured JSON
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description: "Friendly, engaging, scenario-specific response to continue the conversation in English.",
          },
          analysis: {
            type: Type.OBJECT,
            properties: {
              original: {
                type: Type.STRING,
                description: "The user's original message verbatim.",
              },
              isCorrect: {
                type: Type.BOOLEAN,
                description: "Whether the user's sentence has zero grammar, spelling, or phrasing mistakes.",
              },
              corrected: {
                type: Type.STRING,
                description: "The corrected full sentence, or the original if it was flawless.",
              },
              correctionsList: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    error: {
                      type: Type.STRING,
                      description: "The incorrect part of the user's sentence.",
                    },
                    correction: {
                      type: Type.STRING,
                      description: "The corrected fragment.",
                    },
                    explanation: {
                      type: Type.STRING,
                      description: "Brief, simple explanation of the grammatical or vocabulary rule.",
                    },
                  },
                  required: ["error", "correction", "explanation"],
                },
                description: "List of specific mistakes corrected. Empty if isCorrect is true.",
              },
              suggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "2-3 alternative ways to say the same thing to sound more native or expressive.",
              },
              scores: {
                type: Type.OBJECT,
                properties: {
                  grammar: { type: Type.INTEGER },
                  vocabulary: { type: Type.INTEGER },
                  naturalness: { type: Type.INTEGER },
                  overall: { type: Type.INTEGER },
                },
                required: ["grammar", "vocabulary", "naturalness", "overall"],
              },
              coachTip: {
                type: Type.STRING,
                description: "A customized 1-2 sentence tip focusing on a relevant grammar point, phrasing, or pronunciation.",
              },
            },
            required: [
              "original",
              "isCorrect",
              "corrected",
              "correctionsList",
              "suggestions",
              "scores",
              "coachTip",
            ],
          },
        },
        required: ["reply", "analysis"],
      };

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      });

      if (!response.text) {
        throw new Error("No response content generated from Gemini.");
      }

      const parsedResponse = JSON.parse(response.text.trim());
      res.json(parsedResponse);
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({
        error: error.message || "An error occurred during conversational analysis.",
      });
    }
  });

  // Text-to-Speech Endpoint
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice } = req.body;
      if (!text) {
        res.status(400).json({ error: "Missing 'text' in request body." });
        return;
      }

      const client = getGeminiClient();

      // We use the Gemini text-to-speech model: 'gemini-3.1-flash-tts-preview'
      // Allowed voice prebuilts: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
      const selectedVoice = voice || "Zephyr";

      const response = await client.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("Speech synthesis failed to produce audio content.");
      }

      res.json({ audio: base64Audio });
    } catch (error: any) {
      console.error("Gemini TTS Error:", error);
      res.status(500).json({
        error: error.message || "An error occurred during speech synthesis.",
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
