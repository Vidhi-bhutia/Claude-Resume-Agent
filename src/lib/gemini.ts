import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function sendMessage(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are Claude, a helpful AI assistant. You are precise, intelligent, and friendly. Your tone is intellectual but approachable. You avoid over-explaining simple things but provide deep insight when asked.",
      },
      history: history,
    });

    const response = await chat.sendMessage({ message: message });
    return response.text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}

export async function* sendMessageStream(message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "You are Claude, a helpful AI assistant. You are precise, intelligent, and friendly. Your tone is intellectual but approachable. You avoid over-explaining simple things but provide deep insight when asked.",
      },
      history: history,
    });

    const streamResponse = await chat.sendMessageStream({ message: message });
    for await (const chunk of streamResponse) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error sending message to Gemini (Stream):", error);
    yield "I'm sorry, I encountered an error while processing your request.";
  }
}
