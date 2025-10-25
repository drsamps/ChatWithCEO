

import { GoogleGenAI, Chat, Type } from "@google/genai";
import { getSystemPrompt, getCoachPrompt } from '../constants';
import { Message, EvaluationResult, CEOPersona } from "../types";

let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
}

export const createChatSession = (studentName: string, persona: CEOPersona, modelId: string, history: Message[] = []): Chat => {
    const genAI = getAI();
    const systemInstruction = getSystemPrompt(studentName, persona);
    
    const formattedHistory = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));

    const chat = genAI.chats.create({
        model: modelId,
        history: formattedHistory,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            topP: 0.9,
        },
    });

    return chat;
};

export const getEvaluation = async (messages: Message[], studentFirstName: string, studentFullName: string, modelId: string): Promise<EvaluationResult> => {
    const genAI = getAI();
    const chatHistory = messages.map(msg => `${msg.role === 'user' ? 'Student' : 'CEO'}: ${msg.content}`).join('\n\n');
    const prompt = getCoachPrompt(chatHistory, studentFullName);

    const response = await genAI.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    criteria: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                question: { type: Type.STRING },
                                score: { type: Type.NUMBER },
                                feedback: { type: Type.STRING },
                            },
                            required: ['question', 'score', 'feedback'],
                        },
                    },
                    totalScore: { type: Type.NUMBER },
                    summary: { type: Type.STRING },
                    hints: { type: Type.NUMBER },
                },
                required: ['criteria', 'totalScore', 'summary', 'hints'],
            },
        },
    });
    
    const jsonString = response.text;
    return JSON.parse(jsonString) as EvaluationResult;
};