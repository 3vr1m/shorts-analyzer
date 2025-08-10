import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  // Don't throw at import time in Next.js; throw in runtime when used
  // to avoid build-time crashes.
}

export const openai = new OpenAI({ apiKey });

export const MODELS = {
  TRANSCRIBE: process.env.TRANSCRIBE_MODEL || "whisper-1",
  ANALYSIS: process.env.ANALYSIS_MODEL || "gpt-4o-mini",
  IDEAS: process.env.IDEAS_MODEL || "gpt-4o-mini",
};
