import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini Vision to decode difficult or stylish QR codes that local libraries miss.
 * Returns null if no content is found or an error occurs.
 */
export const decodeQRWithGemini = async (base64Data: string, mimeType: string): Promise<string | null> => {
  try {
    // Use gemini-3-pro-preview for complex visual reasoning tasks to avoid hallucinations
    // on "stylish" QR codes where flash models might prioritize the background image over the data.
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: `Task: specific data extraction from QR code.
          
You are a machine vision engine. Your ONLY goal is to read the encoded data in this QR code.

CRITICAL WARNINGS:
1. This is likely a "Stylish QR" containing artwork (e.g., anime characters, logos) in the center.
2. COMPLETELY IGNORE the artistic image content. Do not interpret the "vibe" of the character.
3. DO NOT HALLUCINATE a URL based on the character (e.g. do not guess Discord, Genshin, or Youtube links).
4. Look ONLY at the black/white data modules and error correction patterns.
5. The data might be a file sharing link (e.g. pan.baidu, drive.google), a random string, or a URL. 

Output ONLY the exact raw string found in the code. Do not output markdown or JSON.` }
        ]
      },
      config: {
        temperature: 0, // Force deterministic output
      }
    });

    const text = response.text;
    return text ? text.trim() : null;
  } catch (error) {
    console.error("Gemini fallback decode failed:", error);
    return null;
  }
};